# Backend

`backend` 폴더에서 실행합니다.

```bash
conda activate rise_team_1
cd backend
python main.py
```

DB 설정은 저장소 루트의 `.env`에서 `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `DB_PORT`를 읽습니다. `DB_HOST`를 쓰지 않으면 `127.0.0.1`에 연결합니다.

`GET /api/health`는 DB 연결 상태를 확인합니다. 서비스에서는 `from db import get_connection` 후 `with get_connection() as connection:` 형태로 SQLAlchemy Core 연결을 사용합니다. 블록이 정상 종료되면 커밋, 예외가 나면 롤백되고 연결은 `QueuePool`로 반환됩니다. 기본 연결 5개와 추가 연결 최대 15개로 동시 연결 상한은 20개입니다.
