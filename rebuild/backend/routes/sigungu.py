from fastapi import APIRouter

from controllers import sigungu


router = APIRouter(tags=["시군구"])
router.add_api_route(
    "/sigungu", sigungu.get_sigungu, methods=["GET"],
    summary="시군구 목록 조회",
    description="전체 시군구 또는 선택한 시도의 시군구 코드와 이름을 조회합니다.",
)
