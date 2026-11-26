from fastapi import APIRouter

from controllers import genders


router = APIRouter(tags=["성별"])
router.add_api_route(
    "/genders", genders.get_genders, methods=["GET"],
    summary="성별 방문 현황 조회",
    description="성별 방문자 수를 조회합니다.",
)
