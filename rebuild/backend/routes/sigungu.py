from fastapi import APIRouter

from controllers import sigungu


router = APIRouter(tags=["시군구"])
router.add_api_route(
    "/sigungu", sigungu.get_sigungu, methods=["GET"],
    summary="시군구 목록 조회",
    description="전체 시군구 또는 선택한 시도의 시군구 코드와 이름을 조회합니다.",
)
router.add_api_route(
    "/sigungu/visit-patterns", sigungu.get_visit_patterns, methods=["GET"],
    summary="구·군별 방문 패턴 조회",
    description="성별·연령별 누적 방문자 수와 언어권별 관심 관광 콘텐츠 방문 수(합산 상위 10곳)를 조회합니다.",
)
router.add_api_route(
    "/sigungu/visitor-comparison", sigungu.get_region_visitor_comparison, methods=["GET"],
    summary="권역별 구·군 누적 방문 현황 비교",
    description="부산 16개 구·군의 외지인 방문 집계와 국적별 외국인 방문 집계를 네 권역으로 묶어 반환합니다.",
)
