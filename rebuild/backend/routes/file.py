from fastapi import APIRouter

from controllers import file

router = APIRouter(tags=["파일 업로드"])
router.add_api_route(
    "/upload", file.upload, methods=["POST"],
    summary="파일 업로드",
    description="하나 이상의 파일을 서버에 업로드합니다.",
)
