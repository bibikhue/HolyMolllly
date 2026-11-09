#!/usr/bin/env bash
# HolyMolllly 공개 사이트 배포 스크립트 (서버에서 실행)
set -euo pipefail

RELEASES=/var/www/mapsosa/releases
DEPLOYED_COMMIT_FILE=/var/www/mapsosa/DEPLOYED_COMMIT
KEEP=5  # 되돌리기용으로 최근 배포 버전 5개 보관

# 마지막 성공 배포와 현재 커밋 사이에서 필요한 작업을 결정한다.
# 첫 배포는 base_commit을 빈 문자열로 전달한다.
deployment_decisions() {
  local base_commit="$1" target_commit="$2" frontend_dir="$3" path
  needs_npm_ci=false
  needs_node_restart=false
  needs_service_install=false
  changed_files=""

  if [[ -z "$base_commit" ]]; then
    needs_npm_ci=true
    needs_node_restart=true
    needs_service_install=true
  else
    changed_files="$(git -c core.quotePath=false diff --name-only "$base_commit" "$target_commit" -- frontend/)"
    while IFS= read -r path; do
      case "$path" in
        frontend/package.json|frontend/package-lock.json) needs_npm_ci=true ;;
        frontend/server/*|frontend/src/data/*) needs_node_restart=true ;;
        frontend/deploy/mapsosa-mice.service) needs_node_restart=true; needs_service_install=true ;;
      esac
    done <<< "$changed_files"
  fi

  if [[ ! -d "$frontend_dir/node_modules" ]]; then
    needs_npm_ci=true
  fi
}

main() {
  local script_dir repo_root frontend_dir after deployed_commit release marker_next attempt disk_summary
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo_root="$(git -C "$script_dir" rev-parse --show-toplevel)"
  frontend_dir="$repo_root/frontend"
  cd "$repo_root"

  echo "== 1/7 배포 잠금"
  exec 9>/tmp/mapsosa-deploy.lock
  flock 9

  echo "== 2/7 최신 코드 받기"
  git pull --ff-only
  after="$(git rev-parse HEAD)"
  git log --oneline -1

  echo "== 3/7 마지막 성공 배포 이후 변경 확인"
  deployed_commit=""
  if [[ -e "$DEPLOYED_COMMIT_FILE" ]]; then
    deployed_commit="$(<"$DEPLOYED_COMMIT_FILE")"
    if [[ ! "$deployed_commit" =~ ^[0-9a-fA-F]{40}$ ]] || ! git cat-file -e "${deployed_commit}^{commit}"; then
      echo "DEPLOYED_COMMIT 값이 유효하지 않습니다: $DEPLOYED_COMMIT_FILE" >&2
      exit 1
    fi
    echo "마지막 성공 배포: $deployed_commit"
  else
    echo "첫 배포: npm ci와 Node 서버 재시작이 필요합니다."
  fi

  deployment_decisions "$deployed_commit" "$after" "$frontend_dir"
  if [[ -n "$changed_files" ]]; then
    printf '변경 파일:\n%s\n' "$changed_files"
  fi
  echo "npm ci 필요: $needs_npm_ci / 서비스 설정 설치 필요: $needs_service_install / Node 서버 재시작 필요: $needs_node_restart"

  cd "$frontend_dir"
  if [[ "$needs_npm_ci" == true ]]; then
    echo "== 4/7 의존성 설치"
    npm ci
  else
    echo "== 4/7 의존성 변경 없음"
  fi

  echo "== 5/7 lint, test, build"
  npm run lint
  npm test
  npm run build

  if [[ "$needs_service_install" == true ]]; then
    echo "== 서비스 설정 설치 및 systemd 재읽기"
    if ! sudo -n install -m 644 "$frontend_dir/deploy/mapsosa-mice.service" /etc/systemd/system/mapsosa-mice.service; then
      echo "서비스 설정 설치 실패: sudo 권한을 확인하세요. 화면은 교체하지 않았습니다." >&2
      exit 1
    fi
    if ! sudo -n systemctl daemon-reload; then
      echo "systemd 설정 재읽기 실패: 서비스 상태를 확인하세요. 화면은 교체하지 않았습니다." >&2
      exit 1
    fi
  fi

  if [[ "$needs_node_restart" == true ]]; then
    echo "== 6/7 Node 서버 재시작 및 상태 확인"
    if ! sudo -n systemctl restart mapsosa-mice.service; then
      echo "Node 서버 재시작 실패: 비밀번호 없는 sudo 권한과 mapsosa-mice.service 상태를 확인하세요. 화면은 교체하지 않았습니다." >&2
      exit 1
    fi

    for attempt in 1 2 3 4 5; do
      if curl -fsS --max-time 5 http://127.0.0.1:4174/api/mice/health | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
        echo "Node 서버 상태 확인 성공 ($attempt/5)"
        break
      fi
      if (( attempt == 5 )); then
        echo "Node 서버 상태 확인 실패 (5회). 화면은 교체하지 않았습니다." >&2
        exit 1
      fi
      sleep 2
    done
  else
    echo "== 6/7 Node 서버 변경 없음"
  fi

  echo "== 7/7 새 버전 교체 및 오래된 버전 정리"
  release="$RELEASES/$(date -u +%Y%m%d-%H%M%S)"
  sudo -n mkdir -p "$release"
  sudo -n cp -a dist/. "$release/"
  sudo -n chown -R root:root "$release"
  sudo -n chmod -R a+rX "$release"
  sudo -n ln -sfn "$release" /var/www/mapsosa/current.next
  sudo -n mv -Tf /var/www/mapsosa/current.next /var/www/mapsosa/current

  ls -1dt "$RELEASES"/*/ | tail -n +$((KEEP + 1)) | xargs -r sudo -n rm -rf

  disk_summary="$(df -h / | tail -1 | awk '{print "서버 저장공간 사용률: " $5 " (남은 공간 " $4 ")"}')"

  # 교체와 정리가 모두 끝난 뒤에만 성공 커밋을 원자적으로 기록한다.
  marker_next="${DEPLOYED_COMMIT_FILE}.next"
  printf '%s\n' "$after" | sudo -n tee "$marker_next" >/dev/null
  sudo -n chmod 644 "$marker_next"
  sudo -n mv -Tf "$marker_next" "$DEPLOYED_COMMIT_FILE"

  echo "배포된 커밋: $after"
  echo "$disk_summary"
  echo "== 배포 완료: $release"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
