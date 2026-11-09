# 팀 맙소사 저장소 작업 규칙 (AGENTS.md)

이 파일은 팀원과 AI 코딩 도구(Codex, ChatGPT, Claude 등)가 작업 전에 반드시 읽는 공용 규칙이다.
지금 어디까지 진행됐는지는 `docs/PROJECT_STATUS.md`에 있다. 작업 전에 함께 읽는다.
`frontend/` 안에서 작업할 때는 `frontend/AGENTS.md`도 함께 따른다. 두 파일이 충돌하면 이 파일이 우선한다.

## 1. 프로젝트 개요

- 주제: 부산 외국인 관광수요 분석 대시보드 (팀 맙소사)
- 사이트: http://54.253.247.179
- 구성
  - 데이터 수집, 저장: Python (conda 환경 `rise_team_1`), MariaDB (Docker) / 데이터 팀: 김봉진, 황지원
  - 화면: React 19 + Vite (`frontend/`)
  - 서버: 현재 Node.js (`frontend/server/`), 새 기능 API는 FastAPI로 `backend/`에 만든다

## 2. 폴더 구조와 담당

| 폴더 | 내용 | 담당 |
| --- | --- | --- |
| `src/data_collection/`, `src/data_storage/` | 데이터 수집, 적재 스크립트 | 김봉진 |
| `src/visualization/` | 분석용 시각화 스크립트 | 데이터 팀 (김봉진, 황지원) |
| `database/` | MariaDB 설정, 초기화 SQL | 김봉진 |
| `frontend/` | 대시보드 화면과 현재 Node 서버 | 김봉진 |
| `backend/` | 새 기능용 FastAPI 서버 | 기능별 담당자 |
| `docs/` | 요구사항 정의서, 회의록, 발표 자료 | 각자 자기 문서 |

### 추가 기능과 담당

| 번호 | 기능 | 담당 | 화면 | API | 데이터 |
| --- | --- | --- | --- | --- | --- |
| 1 | 월간 브리핑 봇 | 김봉진 | `frontend/src/features/monthly-briefing/` | `backend/monthly_briefing/` | `src/features/monthly_briefing/` |
| 2 | What-if 시뮬레이터 | 김봉진 | `frontend/src/features/what-if/` | `backend/what_if/` | `src/features/what_if/` |
| 3 | 관광 편의시설 지도 | 박정하 | `frontend/src/features/facility-map/` | `backend/facility_map/` | `src/features/facility_map/` |
| 4 | 업소당 외국인 소비 지도 | 김봉진 | `frontend/src/features/store-spend-map/` | `backend/store_spend_map/` | `src/features/store_spend_map/` |
| 5 | 여행객 추천 코스 | 황지원 | `frontend/src/features/tour-course/` | `backend/tour_course/` | `src/features/tour_course/` |

- 자기 기능 폴더 안에서는 자유롭게 작업한다.
- 다른 사람의 폴더는 고치지 않는다. 고쳐야 하면 담당자에게 먼저 알린다.
- 공용 파일(아래 4번)은 PR 설명에 "공용 파일 수정"이라고 적고, 담당자 확인을 받은 뒤 합친다.

## 3. 작업 순서 (AI 도구 포함)

1. 작업 전 `git checkout main` 후 `git pull`로 최신 상태를 받는다.
2. 브랜치를 만든다. 이름: `feature/<기능이름>-<짧은설명>` (예: `feature/facility-map-data`)
3. AI 도구는 먼저 관련 파일을 조사해 계획을 짧게 보고하고, 사람이 승인한 뒤 구현한다.
4. 작업이 끝나면 아래 6번의 검사를 통과시킨다.
5. 브랜치를 올리고(`git push -u origin <브랜치>`) GitHub에서 Pull Request를 만든다.
6. main에는 PR로만 합친다. main에 직접 push하지 않는다.

AI 도구는 사람이 요청하지 않는 한 commit, push, merge, 배포, 서버 접속(ssh)을 하지 않는다.

## 4. 공용 파일 (함부로 고치지 않음)

- 루트: `README.md`, `.gitignore`, `.env.sample`, `environment.yml`, `AGENTS.md`
- `database/docker-compose.yml`, `database/init/`
- `frontend/src/App.jsx`, `frontend/src/App.css`, `frontend/src/index.css`, `frontend/package.json`, `frontend/vite.config.js`
- `frontend/deploy/` (배포 설정)

새 기능을 메뉴에 연결하려면 `frontend/src/App.jsx`를 고쳐야 한다. 이 경우 메뉴 연결 부분만 최소로 고치고 PR에 적는다.

## 5. 절대 하지 않는 것

- 비밀값 커밋 금지: `.env`, `database/.env`, `frontend/.env.server`, API 키, 비밀번호, 서버 접속 키(`.pem`)
- 강제 push(`git push --force`), 이미 올린 커밋 고쳐 쓰기 금지
- 10MB가 넘는 파일, 자동 생성된 결과 이미지, 대용량 CSV를 새로 커밋하지 않는다 (필요하면 담당자와 상의)
- 원자료 파일을 덮어쓰지 않는다. 가공 결과는 새 파일로 저장한다
- 화면, 문서에 '취약 지역'이라는 표현을 쓰지 않는다. "확충 우선 검토 지역"처럼 기회 관점으로 쓴다
- 출처를 확인하지 못한 수치를 지어내지 않는다. 확인 못 한 내용은 "확인 필요"로 표시한다

## 6. 실행, 검사 방법

### 데이터 (루트에서 실행)

```
conda activate rise_team_1
docker compose -f database/docker-compose.yml --env-file database/.env up -d
python src/data_collection/<스크립트>.py
```

스크립트는 루트 기준 상대경로(`data/`, `database/.env`)를 쓰므로 반드시 루트에서 실행한다.

### 화면 (frontend 폴더에서 실행)

```
cd frontend
npm ci
npm run dev
```

PR 전 검사 (모두 통과해야 함):

```
npm run lint
npm run build
npm test
```

### 새 기능 API (backend 폴더)

FastAPI로 만든다. 기능별 하위 폴더에 라우터를 두고, 실행 방법과 필요한 패키지는 각 폴더의 README에 적는다.

## 7. DB

- 현재 팀 DB는 MariaDB (`database/docker-compose.yml`)이다.
- 접속 정보는 `database/.env`(커밋 금지)에 둔다. 예시는 `database/.env.sample`.
- 새 테이블이 필요하면 표 이름을 기능 이름으로 시작한다 (예: `store_spend_map_result`).
- 다른 기능의 테이블은 읽기만 한다.

## 8. 배포

- 현재 사이트는 아직 예전 저장소(bibikhue/front_code) 기준으로 배포 중이다.
- 배포 방식을 이 저장소로 전환하기 전까지 팀원은 배포하지 않는다.
- 전환 후에는 PR이 main에 합쳐지면 GitHub Actions가 검사와 배포를 자동으로 한다 (예정). 서버 접속 키는 공유하지 않는다.
