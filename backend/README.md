# 맙소사 기능 API

루트에서 Python 3.12 환경 `rise_team_1`을 사용합니다.

```text
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
python -m pytest backend/tests
```

API 문서는 `http://127.0.0.1:8000/docs`, 상태 확인은
`http://127.0.0.1:8000/api/v1/health`입니다. 상태 확인은 DB 접속을
2초 제한으로 시도하며 결과를 `ok` 또는 `unavailable`로만 표시합니다.
DB가 꺼져 있거나 설정이 없어도 서버와 각 `/ping`은 동작합니다.

## 새 API 추가

자신이 맡은 `backend/<기능>/router.py`에서 기존 `router`에 함수를
추가합니다. 예를 들어:

```python
@router.get("/items")
def list_items():
    return {"items": []}
```

주소는 `/api/v1/<기능의 kebab-case 이름>/items`가 됩니다. 다섯 기능의
기본 주소는 `tour-course`, `facility-map`, `store-spend-map`,
`monthly-briefing`, `what-if`입니다. 각 `/ping`은 연결 확인용입니다.

DB 값은 루트 `database/.env`에서 읽고, 같은 이름의 프로세스 환경변수보다
이 파일을 우선합니다. `HOST`는 범용 환경변수와 충돌하지 않도록
`database/.env`에 있을 때만 사용하고 없으면 `localhost`입니다.
비밀값을 코드나 응답에 넣지 마세요.

팀원은 자기 기능 폴더 안에서만 작업합니다. 공용 `backend/main.py`와
`backend/core/`는 팀장 승인 없이 수정하지 않습니다.
