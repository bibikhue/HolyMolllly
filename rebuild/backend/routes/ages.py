from fastapi import APIRouter

from controllers import ages


router = APIRouter(tags=["연령"])
router.add_api_route(
    "/ages", ages.get_ages, methods=["GET"],
    summary="연령별 방문 현황 조회",
    description="연령대별 방문자 수를 조회합니다.",
)
router.add_api_route(
    "/ages/visitors/sigungu", ages.get_age_visitors_by_sigungu, methods=["GET"],
    summary="연령대별 부산 구·군 방문 비율 조회",
    description="각 연령대의 방문자 수를 부산 구·군별로 합산하고, 연령대 내 비율(%)을 네 권역으로 묶어 반환합니다.",
)
