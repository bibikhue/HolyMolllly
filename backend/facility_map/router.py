# 담당: 박정하. 이 폴더 안에서만 작업합니다.

from fastapi import APIRouter


router = APIRouter()


@router.get("/ping")
def ping() -> dict[str, str]:
    return {"status": "ok"}
