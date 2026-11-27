# Backend

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
