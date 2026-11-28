from fastapi import APIRouter

from controllers import countries


router = APIRouter(tags=["국가"])
router.add_api_route(
    "/countries/clusters", countries.get_country_clusters, methods=["GET"],
    summary="DB 기반 국가별 방문·소비 유형 분석",
    description="DB의 11개 지표를 표준화해 K-means 4개 군집(n_init=50, random_state=42)으로 분류하고 PCA 2차원 좌표를 반환합니다. 실루엣 점수는 계산하지 않습니다.",
)
router.add_api_route(
    "/countries/sales-per-visitor/distribution", countries.get_sales_per_visitor_distribution, methods=["GET"],
    summary="국가별 월별 1인당 관광소비액 분포 조회",
    description="방문객 수가 양수인 국가별 월간 소비액을 방문객 수로 나눕니다. 기타와 양수가 아닌 소비액은 제외하며 중앙값 내림차순으로 반환합니다.",
)
router.add_api_route(
    "/countries/visitors", countries.get_country_summary, methods=["GET"],
    summary="국가별 방문객 합계 조회",
    description="선택한 기간과 시군구의 외국인 방문객 수를 국가별로 합산하고, 전체 대비 비율(%)과 적용된 시작·끝 연월을 함께 반환합니다.",
)
router.add_api_route(
    "/countries/sales", countries.get_country_sales, methods=["GET"],
    summary="국가별 관광소비 합계 조회",
    description="선택한 기간과 시군구의 관광소비 금액을 국가별로 합산하고, 전체 대비 비율(%)과 적용된 시작·끝 연월을 함께 반환합니다.",
)
router.add_api_route(
    "/countries/visitors/monthly", countries.get_monthly_country_visitors, methods=["GET"],
    summary="국가별 월간 방문객 조회",
    description="월·국가별 외국인 방문객 수와 해당 월의 국가별 비율(%)을 조회합니다.",
)
router.add_api_route(
    "/countries/sales/monthly", countries.get_monthly_country_sales, methods=["GET"],
    summary="국가별 월간 관광소비 조회",
    description="월·국가별 관광소비 금액과 해당 월의 국가별 비율(%)을 조회합니다.",
)
router.add_api_route(
    "/countries/sales-per-visitor", countries.get_sales_per_visitor, methods=["GET"],
    summary="국가별 1인당 관광소비 조회",
    description="같은 연월·시군구·국가의 관광소비 합계를 방문객 수 합계로 나눈 값을 조회합니다.",
)
router.add_api_route(
    "/countries/sales-per-visitor/monthly", countries.get_monthly_sales_per_visitor, methods=["GET"],
    summary="특정 국가의 연도별 월간 1인당 관광소비 조회",
    description="선택한 국가의 월별 1인당 관광소비를 연도별 시리즈로 반환합니다. 데이터가 없는 달은 null입니다.",
)
router.add_api_route(
    "/countries/visitors/sigungu", countries.get_country_visitors_by_sigungu, methods=["GET"],
    summary="특정 국가의 부산 구·군별 방문객 조회",
    description="선택한 국가의 방문객 수와 부산 구·군별 비율(%)을 네 권역으로 묶어 반환합니다.",
)
