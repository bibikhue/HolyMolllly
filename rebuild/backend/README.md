# Backend

프론트와 백엔드의 환경변수는 저장소 루트 `.env`에서 관리합니다.
프론트 API 주소는 `VITE_API_BASE_URL=/api`로 설정하면 개발 시 Vite 프록시를 사용합니다.
브라우저에 공개되는 변수에는 `VITE_`를 붙이며, API 키나 DB 비밀번호에는 붙이지 않습니다.
프론트 환경변수 변경 후에는 개발 서버 재시작 또는 프로덕션 재빌드가 필요합니다.

SMTP 설정도 루트 `.env`에서 관리합니다. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`,
`SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_USE_TLS`, `SMTP_USE_SSL`,
`SMTP_TIMEOUT`을 사용합니다. 기본은 587 포트의 STARTTLS(`USE_TLS=true`, `USE_SSL=false`)이며,
465 포트의 SSL은 `USE_TLS=false`, `USE_SSL=true`로 설정합니다. 두 옵션을 동시에 켜지 않습니다.
SMTP 설정에는 `VITE_`를 붙이지 않습니다. 현재는 설정 항목만 준비한 상태이며 메일 발송은 연결하지 않았습니다.

## 그래프 참고 챗봇

루트 `.env`에 `OPENAI_API_KEY`를 설정하고 백엔드를 재시작합니다.
`OPENAI_MODEL` 기본값은 `gpt-6-luna`이며 변경할 수 있습니다. 프론트 환경변수에는 키를 넣지 않습니다.
추가 Python 패키지 없이 OpenAI Responses API를 호출합니다.

`POST /api/chatbot/messages`는 `message`, 최근 대화 `history`(최대 24개 메시지, 12턴), 현재 화면 `context`를 받습니다.
성공 응답은 `{"answer": "..."}`입니다. 빈 질문은 400/422, 잘못된 대화 형식은 400,
화면 자료 120KB 초과는 413, 키 미설정은 503, OpenAI 한도 초과는 429를 반환합니다.
`@그래프해석`이 있는 질문에만 `context`를 첨부합니다. 일반 질문은 백엔드에서도 context를 무시합니다.
관광 정책의 국가별 통계와 상권 분석에서는 API 응답으로 등록한 방문·소비 기본·상세 자료를 함께 참고합니다.
데이터는 현재 페이지와 조회 조건에 한정하며 DB를 추가 조회하지 않습니다. 유형화는 별도 분석 자료로 구분합니다.
월별 국가 데이터는 날짜 축을 공유하고, 분포는 사분위수·중앙값·수염·이상치 기준으로 요약합니다.
화면 상태는 App 메모리에만 보관하고 질문 전송 직전에 갱신합니다.
로딩 중에는 이전 그래프 값을 전송하지 않습니다. 대화는 브라우저 새로고침 시 초기화됩니다.
답변은 텍스트로만 제공하며 챗봇 그래프 생성 기능은 없습니다.
OpenAI 요청에 `store: false`를 사용합니다.

### 데이터 질문

모든 사용자에게 `데이터 질문` 버튼을 표시합니다. `@데이터질문` 또는 선택 후 이어지는 질문은
로그인 없이 `POST /api/chatbot/data`로 전송합니다. 행사 기획 상담은 계속 로그인이 필요합니다.
관광 데이터 NL2SQL의 읽기 전용 조회·테이블 제한·실행 제한을 동일하게 적용하고,
행사 기획 지시 없이 데이터 집계·비교 질문에 답합니다. 모드별 대화 이력은 따로 전달합니다.
일반 채팅과 데이터 조회 API는 구분하며, 데이터 조회에는 기존 허용 관광 테이블만 사용합니다.
공개 데이터 질문은 IP별 분당 5회·24시간 30회, 서버 전체 24시간 500회로 제한하고 초과 시 429를 반환합니다.
현재 요청 제한은 단일 프로세스 메모리 기준입니다. 다중 프로세스·배포 시에는 공용 저장소와 신뢰할 프록시 설정이 필요합니다.

### 행사 기획 상담

로그인하면 챗봇에 `행사 기획 상담` 버튼이 나타납니다. `@행사기획` 질문은
`POST /api/chatbot/planning`으로 전송하며 `Depends(require_user)`로 세션 쿠키를 검증합니다.
일반 사용자와 관리자 모두 이용할 수 있고, 비로그인·만료 세션은 401을 반환합니다.

`message`, `history`, `filters`(공통 `period`, `district`, `country`)를 받습니다.
루트에서 `conda env update -n rise_team_1 -f environment.yml`로 NL2SQL 의존성을 설치합니다.
서버는 허용된 관광 분석 테이블의 구조·컬럼 코멘트를 OpenAI에 전달하고,
최근 사용자 발언과 현재 질문에 필요한 SQL을 생성합니다. 화면의 기본 구군·국가는 개최 조건으로 간주하지 않습니다.
SQL AST 검증으로 단일 SELECT·허용 테이블·허용 함수를 제한하고, MariaDB 읽기 전용 트랜잭션에서
최대 5초·200행으로 실행합니다. 집계 결과를 OpenAI에 전달해 기존 대화 이력과 함께 상담합니다.
DB 접속 정보는 전달하지 않습니다. 군집 질문에는 기존 K-means 계산 결과를 함께 제공합니다.
CSV·외부 웹 검색·벡터 DB는 사용하지 않으며 일반 채팅과 그래프 해석의 조회 방식은 변경하지 않습니다.

응답은 `answer`와 `sources`(자료 ID·제목·출처)를 포함합니다.
본문에는 내부 인용 번호를 노출하지 않고, 접힌 `참고 데이터`에 중복 없는 자료명만 표시합니다.
외지인 대상 상담은 `visitor_demographics`의 성별·연령별 방문 자료를 우선 사용하며,
무관한 외국인 국가별 소비·군집 자료는 제외합니다. 대화에서 행사 지역을 정하지 않았다면
화면의 선택 구군을 행사 지역으로 단정하지 않고 미정으로 유지합니다.
지역이 미정이면 화면의 구군 필터를 행사 기획 검색에 적용하지 않습니다.
연령·성별 타깃은 부산 전체 구군의 해당 방문 건수·지역 내 비중을 비교해 후보군을 만들고,
상담에서는 구군 2~3곳의 차이를 먼저 제시합니다. 사용자가 후보를 고르기 전에는 특정 지역 확정을 유도하지 않습니다.
행사 기획 상담 모드는 전송 후에도 유지됩니다. 키워드를 매번 입력하지 않아도 후속 질문을
같은 상담 API로 전송하고 최근 12턴의 대화와 상담 시작 시 조회 조건을 함께 전달합니다.
검색에도 이전 사용자 질문을 반영하고, 지역·국가를 수정하면 최근 언급한 조건을 우선합니다.
상담 버튼을 다시 누르거나 채팅을 초기화하면 상담 모드와 조회 조건을 해제합니다.

출력 한도는 일반 질문 4,000토큰, 행사 기획 6,000토큰이며 GPT-6 계열 추론 강도는 `low`입니다.
OpenAI의 `incomplete/max_output_tokens`를 확인하면 최대 한 번 8,000토큰으로
간결한 완결 답변을 다시 요청합니다. 여전히 미완료이면 `incomplete: true`를 반환해 화면에 표시합니다.
긴 답변이 후속 요청에서 거부되지 않도록 대화 메시지 한도는 각 20,000자입니다.
군집 계산에 필요한 2024~2025년 전체가 없는 기간은 그 제한을 근거에 명시하며,
임의로 분석 기간을 바꾸지 않습니다. 그래프 생성 없이 텍스트 기획 제안만 제공합니다.

## 임시 로그인 API

`POST /api/auth/login`에 JSON을 전송합니다.

```json
{"username": "admin123", "password": "pass123"}
```

계정은 `admin123 / pass123` (role: `admin`), `user123 / pass123` (role: `user`)입니다.
성공하면 `200`과 `{"user": {"username": "admin123", "role": "admin"}}`을 반환하고,
임의의 세션 ID와 role을 포함한 쿠키 `auth_session`을 설정합니다.
쿠키 전체 값을 서버의 세션 딕셔너리와 대조하므로 role만 바꾼 쿠키는 거부합니다.
계정 정보가 다르면 `401`, 필수 값 누락 또는 빈 문자열은 `422`를 반환합니다.
계정은 `services/auth.py`의 `USERS` 딕셔너리에만 저장하며 DB를 조회하지 않습니다.
쿠키는 HttpOnly, SameSite=Lax, Path=/api이며 1시간 동안 유효합니다.
`GET /api/auth/me`로 쿠키를 검증해 현재 사용자를 조회하고,
`POST /api/auth/logout`으로 세션 폐기 및 쿠키 삭제를 수행합니다.
HTTPS 환경에서는 `AUTH_COOKIE_SECURE=true`를 설정합니다.
세션은 메모리에 있으므로 서버 재시작 시 로그아웃되며 현재 단일 프로세스용입니다.
쿠키 추출과 검증은 `controllers/auth.py`의 FastAPI 의존성으로 처리합니다.
로그인이 필요한 API는 `Depends(require_user)`, 관리자 API는 `Depends(require_admin)`을 사용합니다.
두 함수는 `from controllers.auth import require_user, require_admin`으로 가져옵니다.
인증 실패는 기존 오류 형식인 `JSONResponse({"code": ..., "message": ...})`를 반환합니다.
라우트의 `dependencies` 반환값은 자동으로 응답되지 않으므로, 컨트롤러는
`request.state.user`가 `JSONResponse`이면 해당 응답을 즉시 반환해야 합니다 (`get_current_user` 참고).
기존 데이터 조회 API의 접근 권한은 변경하지 않았습니다.

`backend` 폴더에서 실행합니다.

```bash
conda activate rise_team_1
cd backend
python main.py
```

DB 설정은 저장소 루트의 `.env`에서 `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `DB_PORT`를 읽습니다. `DB_HOST`를 쓰지 않으면 `127.0.0.1`에 연결합니다.

`GET /api/health`는 DB 연결 상태를 확인합니다. 서비스에서는 `from db import get_connection` 후 `with get_connection() as connection:` 형태로 SQLAlchemy Core 연결을 사용합니다. 블록이 정상 종료되면 커밋, 예외가 나면 롤백되고 연결은 `QueuePool`로 반환됩니다. 기본 연결 5개와 추가 연결 최대 15개로 동시 연결 상한은 20개입니다.
