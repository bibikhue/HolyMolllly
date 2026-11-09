#!/usr/bin/env bash
# 공개 사이트 반영 스크립트 (서버에서 실행)
# 사용법 (내 컴퓨터에서 한 줄):
#   ssh ec2-54-253-247-179.ap-southeast-2.compute.amazonaws.com "bash ~/my-app/deploy/deploy.sh"
# 단계 중 하나라도 실패하면 즉시 멈추고, 공개 사이트는 이전 버전 그대로 유지된다.
set -euo pipefail

cd "$(dirname "$0")/.."
RELEASES=/var/www/mapsosa/releases
KEEP=5   # 남겨둘 이전 버전 개수 (되돌리기용)

echo "== 1/5 최신 코드 받기"
before=$(git rev-parse HEAD)
git pull --ff-only
after=$(git rev-parse HEAD)
if [ "$before" = "$after" ]; then
  echo "!! GitHub에 새 커밋이 없습니다. 내 컴퓨터에서 git push가 됐는지 확인하세요. (계속 진행합니다)"
fi
git log --oneline -1

echo "== 2/5 부품 확인"
if ! git diff --quiet "$before" "$after" -- package.json package-lock.json; then
  echo "package.json이 바뀌어 npm ci를 실행합니다."
  npm ci
fi

echo "== 3/5 코드 검사와 빌드"
npm run lint
npm run build

echo "== 4/5 새 버전으로 교체"
release="$RELEASES/$(date -u +%Y%m%d-%H%M%S)"
sudo mkdir -p "$release"
sudo cp -a dist/. "$release/"
sudo chown -R root:root "$release"
sudo chmod -R a+rX "$release"
sudo ln -sfn "$release" /var/www/mapsosa/current.next
sudo mv -Tf /var/www/mapsosa/current.next /var/www/mapsosa/current

echo "== 5/5 오래된 버전 정리 (최근 ${KEEP}개만 남김)"
ls -1dt "$RELEASES"/*/ | tail -n +$((KEEP + 1)) | xargs -r sudo rm -rf
df -h / | tail -1 | awk '{print "서버 저장공간 사용률: " $5 " (남은 공간 " $4 ")"}'

echo "== 배포 완료: $release"
