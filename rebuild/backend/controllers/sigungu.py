from fastapi import Query

from controllers.errors import handle_service_error
from services import sigungu
from services import visit_patterns


def get_sigungu(
    sido_cd: str | None = Query(default=None, description="조회할 시도 코드. 생략하면 전체 시군구를 반환합니다. 예: 26(부산)")
):
    return handle_service_error(sigungu.get_sigungu, sido_cd)


def get_visit_patterns(
    sgg_cd: str = Query(description="부산 구·군 코드(5자리)"),
    start_ym: str = Query(description="시작월(YYYY-MM)"),
    end_ym: str = Query(description="종료월(YYYY-MM)"),
):
    return handle_service_error(visit_patterns.get_visit_patterns, sgg_cd, start_ym, end_ym)


def get_region_visitor_comparison(
    start_ym: str = Query(description="시작월(YYYY-MM)"),
    end_ym: str = Query(description="종료월(YYYY-MM)"),
):
    return handle_service_error(visit_patterns.get_region_visitor_comparison, start_ym, end_ym)
