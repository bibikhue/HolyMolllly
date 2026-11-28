from fastapi import APIRouter

from controllers import industries


router = APIRouter(tags=["업종"])
router.add_api_route(
    "/industries", industries.get_industries, methods=["GET"],
    summary="업종별 관광 소비 조회",
    description="관광 업종별 소비 분석 결과를 조회합니다.",
)
router.add_api_route(
    "/industries/sales", industries.get_country_sigungu_sales, methods=["GET"],
    summary="특정 국가·구군의 업종별 소비 조회",
    description="선택한 국가와 부산 구·군의 외국인 간편결제 소비를 상위 업종별로 합산합니다. 금액 단위는 천원입니다.",
)
router.add_api_route("/industries/sales/overview", industries.get_sales_overview, methods=["GET"], summary="부산 월별 구·군·업종별 간편결제 소비 규모")
router.add_api_route("/industries/sales/patterns", industries.get_sales_patterns, methods=["GET"], summary="구·군의 국적별 간편결제 소비 규모와 월별 추이")
