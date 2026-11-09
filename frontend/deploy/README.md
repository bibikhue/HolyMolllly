# 공개 서버 배포

현재 공개 주소: http://54.253.247.179/

Nginx가 `/var/www/mapsosa/current`의 빌드 결과만 제공합니다. `current`는 배포 버전 디렉터리를 가리키는 심볼릭 링크입니다.
공개 IP는 EC2 메타데이터로 확인했으며 기존 DuckDNS 도메인은 이전 IP를 가리키므로 현재 배포에는 사용하지 않습니다.

- 빌드 환경 설정: `frontend/.env.production`의 `VITE_SITE_URL`
- Nginx 설정 원본: `frontend/deploy/mapsosa-ip.conf`
- 적용된 설정: `/etc/nginx/conf.d/mapsosa-ip.conf`
- 첫 배포: `/var/www/mapsosa/releases/20261007-0710`

## 전환 후 자동 배포

`main`에 변경이 반영되면 `.github/workflows/frontend.yml`이 `frontend/`에서 `npm ci → lint → test → build`를 검사한 뒤 SSH로 `~/holymolly/frontend/deploy/deploy.sh`를 실행합니다. Pull Request에서는 `frontend/**` 또는 워크플로 파일이 바뀌었을 때 검사만 합니다. FastAPI 서버 배포는 이번 범위에 포함되지 않습니다.

배포 스크립트는 잠금 → `git pull --ff-only` → 마지막 성공 배포 이후 변경 확인 → 필요시 `npm ci` → lint → test → build → 필요시 Node 서버 재시작 및 상태 확인 → 새 release 교체 → 최근 5개 release 보관 순서로 실행합니다. 상태 확인이 실패하면 화면 링크를 교체하지 않습니다.

`/var/www/mapsosa/DEPLOYED_COMMIT`은 교체와 정리가 모두 성공한 뒤에만 갱신합니다. 파일이 없는 첫 배포는 `npm ci`와 Node 서버 재시작을 모두 수행합니다. 실패한 배포의 변경은 다음 실행 때 다시 판단합니다. 이 파일은 직접 만들지 않습니다.

## 서버 1회 설정

새 배포 파일이 `main`에 합쳐진 뒤 EC2의 `ubuntu` 계정에서 실행합니다. Node.js 22와 `flock`, `curl`, `npm`이 필요합니다.

```bash
git clone --filter=blob:none --no-checkout https://github.com/bibikhue/HolyMolllly.git ~/holymolly
cd ~/holymolly && git sparse-checkout init --cone && git sparse-checkout set frontend backend && git checkout main
node --version
sudo install -m 644 ~/holymolly/frontend/deploy/mapsosa-mice.service /etc/systemd/system/mapsosa-mice.service
sudo systemctl daemon-reload
sudo systemctl enable mapsosa-mice.service
sudo systemctl restart mapsosa-mice.service
curl -fsS http://127.0.0.1:4174/api/mice/health
sudo -n true
```

필요한 서버 설정은 `~/holymolly/frontend/.env.server`에 직접 준비하고 권한을 `600`으로 설정합니다. 배포 스크립트는 `sudo -n`으로 서비스 재시작과 `/var/www/mapsosa/` 파일 작업을 하므로, 서버 계정에 해당 비밀번호 없는 권한이 있어야 합니다. Nginx는 기존 `/var/www/mapsosa/current`를 계속 제공합니다.

GitHub 저장소의 Actions Secrets에 다음 세 항목을 등록합니다. 실제 값은 문서나 저장소에 기록하지 않습니다.

- `EC2_HOST`: EC2 접속 호스트명 또는 IP
- `EC2_USER`: SSH 접속 계정
- `EC2_SSH_KEY`: 해당 계정에 접속할 수 있는 SSH 개인 키

서버 계정의 `authorized_keys`에 대응하는 공개 키가 등록되어 있어야 합니다. `EC2_HOST`가 비어 있으면 "Secrets 미설정"을 출력하고 배포를 건너뜁니다. 다른 필수 Secret이 비어 있으면 배포 작업은 실패합니다.

## 수동으로 다시 배포

GitHub 저장소의 **Actions → Frontend check and deploy → Run workflow**에서 `main`을 선택해 실행합니다. 검사 통과 후 서버 스크립트가 다시 실행됩니다.

## 화면 되돌리기

서버에서 이전 release를 고른 뒤 `current` 링크를 교체합니다. `<이전-release-이름>`은 실제 디렉터리 이름으로 바꿉니다.

```bash
ls -1dt /var/www/mapsosa/releases/*/
previous_release="/var/www/mapsosa/releases/선택한-release-이름"
sudo ln -sfn "$previous_release" /var/www/mapsosa/current.next
sudo mv -Tf /var/www/mapsosa/current.next /var/www/mapsosa/current
```

이 방법은 Nginx가 제공하는 화면만 되돌립니다. Node 서버 변경은 별도로 처리해야 하며, 다음 자동 배포에서는 `main`의 최신 화면이 다시 반영됩니다. 화면 링크 교체에는 Nginx 재시작이 필요하지 않습니다.

## 전환 전 방식

서버 전환 완료 전에는 기존 `~/my-app` 배포를 유지합니다. 이전에는 내 컴퓨터에서 SSH 한 줄로 `bash ~/my-app/deploy/deploy.sh`를 실행했습니다.

## 부산 MICE 캘린더

헤더의 **부산 행사 캘린더** 탭 또는 `/#/events`에서 조회합니다. 홈 대시보드에는 달력을 표시하거나 행사 목록을 자동 조회하지 않습니다. 자동 리포트의 선택적 행사 요약과 챗봇의 행사 조회는 그대로 지원합니다.

공식 출처는 [부산 MICE 플랫폼 행사정보](https://www.busanmice.or.kr/portal/evntInfo/list.do?mid=0203000000)입니다.
페이지의 공개 목록 조회 경로를 서버에서 읽습니다. 문서화된 OpenAPI가 아니므로 원본의 응답 구조가 변경되면 연동 코드를 수정해야 합니다.

- 로컬 실행: `npm run mice:server`와 `npm run dev`를 각각 실행합니다. Vite가 `/api/mice`를 로컬 서버로 전달합니다.
- 운영 실행: 위 서버 1회 설정에서 `frontend/deploy/mapsosa-mice.service`를 설치합니다.
- Nginx의 `/api/mice/`는 `127.0.0.1:4174`로 전달됩니다. 백엔드는 외부 인터페이스에서 직접 수신하지 않습니다.
- `frontend/server/` 또는 `frontend/src/data/`가 바뀌면 배포 스크립트가 Node 서버를 재시작하고 `/api/mice/health`를 확인합니다. 추적되지 않는 `.env.server` 변경은 서버에서 별도로 재시작해야 합니다.
- 조회 범위는 이번 달 앞뒤 12개월입니다. 월별 결과를 6시간 캐시하고, 같은 월의 동시 요청은 하나로 합칩니다. 갱신 실패 시 최대 48시간 이내의 이전 결과를 표시하고 이전 자료임을 알립니다.
- API는 행사 ID·제목·기간·장소·유형·원본 링크만 제공합니다. 불완전한 페이지 수집은 성공으로 처리하지 않습니다.
- 원본 서버에서 빠진 중간 인증서는 발급기관 GlobalSign의 공개 인증서로 보완합니다. TLS 검증을 끄지 않습니다. 인증서 변경 시 `server/certs`의 중간 인증서를 확인합니다.
- 날짜별 건수는 그날 진행 중인 행사 수입니다. 장기간 행사는 각 날짜에 포함되며, 실제 관광객 수나 혼잡도를 나타내지 않습니다.
- 검증: `npm run test:mice`.

## 관광 데이터 챗봇

우측 챗봇은 `/api/chat`에 질문을 보내고, 기존 4174번 서버가 처리합니다.
방문객 자료는 `src/data/visitorDemo.js`의 예시 데이터, 행사 자료는 위 MICE 조회 캐시를 공유합니다.
LLM은 읽기 전용 함수 호출로 방문객·행사·프로젝트 범위를 조회하며, 실제 출처 링크는 서버에서 추가합니다.
연동 방식은 [OpenAI Responses API 함수 호출](https://developers.openai.com/api/docs/guides/function-calling)을 사용합니다.

API 키가 없으면 UI에 **데이터 조회 모드 · LLM 연결 전**으로 표시합니다.
이 모드는 제한된 질문만 처리하며 LLM 답변으로 표시하지 않습니다.

### LLM 활성화

프로젝트 루트에서 `.env.server.example`을 `.env.server`로 복사하고 편집기로 `OPENAI_API_KEY`와 `OPENAI_MODEL`을 설정합니다.
API 키를 채팅에 붙여넣거나 `VITE_` 변수에 넣지 않습니다. `.env.server`는 gitignore에 포함되며 공개 빌드 디렉터리에 복사하지 않습니다.

```bash
cp .env.server.example .env.server
chmod 600 .env.server
# 편집기에서 OPENAI_API_KEY와 OPENAI_MODEL을 설정한 뒤:
sudo systemctl restart mapsosa-mice.service
```

`.env.server`는 서버 시작 시 읽습니다. 프런트엔드 재빌드는 필요하지 않습니다.
모델 기본값은 `gpt-5-mini`이며 환경변수로 변경할 수 있습니다.
현재 연결 키가 없어 실제 모델 응답의 운영 검증은 수행하지 않았습니다. 함수 호출 흐름은 모의 모델로 검증했습니다.

- API 키는 서버에서만 사용합니다. 브라우저에는 연결 모드만 전달합니다.
- 대화는 현재 브라우저의 메모리에만 유지하며 서버에 저장하지 않습니다. LLM 사용 시 질문/최근 대화/조회된 근거가 OpenAI에 전송되고 Responses API `store:false`를 사용합니다. 이는 공급자의 모든 로그 보존을 비활성화한다는 뜻은 아닙니다.
- 방문객 수는 항상 예시라고 표시하며, 아직 없는 실제 통계·소비 군집·예측 순위는 생성하지 않도록 지시합니다.
- 질문 1,000자, 최대 7개 대화 메시지, 최대 4개 데이터 조회 호출로 제한합니다. 동시에 처리하는 요청은 최대 3개이고, IP별 1분 10회로 제한합니다.
- `CHAT_DAILY_LIMIT`은 서버의 하루 LLM 질문 상한입니다(기본 200, UTC 기준, 서버 재시작 시 초기화). 요금 상한을 보장하는 기능은 아니므로 운영 계정의 사용 한도도 별도로 설정할 수 있습니다.
- 검증: `npm run test:chat`.

## 자동 분석 리포트

`/#/reports`에서 기간(2024–2025), 국가, 요약 관점을 선택하고 생성합니다.
헤더의 분석 리포트 하위 메뉴와 홈의 리포트 카드에서 접근할 수 있습니다.
방문객 지표는 서버가 동일한 예시 자료로 계산하며, 브라우저가 보낸 합계나 임의 지시문은 받지 않습니다.
행사 요약을 선택하면 별도 조회 월의 부산 전체 공식 일정을 포함합니다. 방문객 기간·국가와 행사를 연결한 인과관계나 혼잡도 추정은 제공하지 않습니다.
원본 일정 조회가 실패하면 방문객 리포트는 제공하되 행사 수치는 제외했다고 표시합니다.

- API: `GET /api/reports/status`, `POST /api/reports`.
- LLM: 기존 `.env.server`의 `OPENAI_API_KEY`와 `OPENAI_MODEL`을 함께 사용합니다. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)로 고정된 요약 섹션을 요청하고 서버에서 형식 및 근거에 없는 숫자를 검사합니다. 수치 토큰 검사만으로 인과 해석의 정확성을 보장하지 않으므로 근거 수치를 함께 제공합니다.
- 키가 없으면 **수치 요약 모드 · LLM 연결 전**으로 표시하며 서버가 계산한 수치를 문장으로 정리합니다. 연결된 LLM의 생성이 실패하면 오류로 표시하고 수치 요약을 LLM 결과로 대체하지 않습니다.
- 챗봇과 리포트는 동시 생성 최대 3개, IP별 1분 10회, `CHAT_DAILY_LIMIT`의 하루 모델 요청 예산을 공유합니다. 리포트 생성은 모델 요청 1회를 사용합니다.
- 생성은 버튼을 눌렀을 때만 실행합니다. 리포트는 화면 메모리에만 유지하며 페이지를 떠나면 사라집니다. 복사·텍스트 다운로드에는 선택 조건, 생성 시점(한국 시간), 예시 자료 표시, 근거와 출처를 포함합니다.
- 모델 API에는 집계된 표시 수치와 선택 조건만 전달하고 `store:false`를 설정합니다.
- Nginx의 `/api/reports`를 4174번 서버로 전달해야 합니다. `deploy/mapsosa-ip.conf` 적용, Nginx 검사·재로드 및 백엔드 재시작 후 프런트엔드를 배포합니다.
- 검증: `npm run test:reports`, 기존 `test:chat`, `test:mice`, `lint`, `build`. 현재 API 키가 없어 실제 모델 호출은 검증하지 못했으며 구조화 응답은 모의 모델로 검증합니다.
