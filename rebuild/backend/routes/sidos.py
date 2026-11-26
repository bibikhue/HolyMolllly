from fastapi import APIRouter

from controllers import sidos


router = APIRouter(tags=["시도"])
router.add_api_route(
    "/sidos", sidos.get_sidos, methods=["GET"],
    summary="시도 목록 조회",
    description="전국 시도 코드와 이름을 조회합니다.",
)
