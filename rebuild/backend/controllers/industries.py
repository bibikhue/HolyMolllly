from fastapi import Query

from controllers.errors import handle_service_error
from services import industries


def get_industries():
    return handle_service_error(industries.get_industries)


def get_country_sigungu_sales(
    country_cd: str = Query(description="국가 코드(3자리). 예: 392(일본), 158(대만), 156(중국), 840(미국)"),
    sgg_cd: str = Query(description="부산 구·군 코드(5자리). 예: 26110(중구), 26230(부산진구)"),
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 가장 이른 데이터부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 가장 최근 데이터까지 조회"),
):
    return handle_service_error(industries.get_country_sigungu_sales, country_cd, sgg_cd, start_ym, end_ym)


def get_sales_overview(start_ym: str = Query(description="시작월(YYYY-MM)"), end_ym: str = Query(description="종료월(YYYY-MM)")):
    return handle_service_error(industries.get_sales_overview, start_ym, end_ym)


def get_sales_patterns(
    sgg_cd: str = Query(description="부산 구·군 코드"),
    start_ym: str = Query(description="시작월(YYYY-MM)"),
    end_ym: str = Query(description="종료월(YYYY-MM)"),
    industry_nm: str | None = Query(default=None, description="업종명. 생략하면 전체 업종"),
):
    return handle_service_error(industries.get_sales_patterns, sgg_cd, start_ym, end_ym, industry_nm)
