from fastapi import Query

from controllers.errors import handle_service_error
from services import countries
from services import country_clusters


def get_country_summary(
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 가장 이른 데이터부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 가장 최근 데이터까지 조회"),
    country_cd: str | None = Query(default=None, description="국가 코드(3자리). 예: 392(일본), 158(대만), 156(중국), 840(미국). 생략하면 전체 국가"),
    sgg_cd: str | None = Query(default=None, description="시군구 코드(5자리). 생략하면 부산 전체 구·군"),
):
    return handle_service_error(countries.get_country_summary, start_ym, end_ym, country_cd, sgg_cd)


def get_country_clusters(
    start_ym: str = Query(description="분석 시작월(YYYY-MM). 2024년·2025년을 포함해야 합니다."),
    end_ym: str = Query(description="분석 종료월(YYYY-MM)"),
    sgg_cd: str | None = Query(default=None, description="부산 구·군 코드. 생략하면 부산 전체"),
):
    return handle_service_error(country_clusters.get_country_clusters, start_ym, end_ym, sgg_cd)


def get_country_sales(
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 가장 이른 데이터부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 가장 최근 데이터까지 조회"),
    country_cd: str | None = Query(default=None, description="국가 코드(3자리). 예: 392(일본), 158(대만), 156(중국), 840(미국). 생략하면 전체 국가"),
    sgg_cd: str | None = Query(default=None, description="시군구 코드(5자리). 생략하면 부산 전체 구·군"),
):
    return handle_service_error(countries.get_country_sales, start_ym, end_ym, country_cd, sgg_cd)


def get_monthly_country_visitors(
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 가장 이른 데이터부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 가장 최근 데이터까지 조회"),
    country_cd: str | None = Query(default=None, description="국가 코드(3자리). 예: 392(일본), 158(대만), 156(중국), 840(미국). 생략하면 전체 국가"),
    sgg_cd: str | None = Query(default=None, description="시군구 코드(5자리). 생략하면 부산 전체 구·군"),
):
    return handle_service_error(countries.get_monthly_country_visitors, start_ym, end_ym, country_cd, sgg_cd)


def get_monthly_country_sales(
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 가장 이른 데이터부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 가장 최근 데이터까지 조회"),
    country_cd: str | None = Query(default=None, description="국가 코드(3자리). 예: 392(일본), 158(대만), 156(중국), 840(미국). 생략하면 전체 국가"),
    sgg_cd: str | None = Query(default=None, description="시군구 코드(5자리). 생략하면 부산 전체 구·군"),
):
    return handle_service_error(countries.get_monthly_country_sales, start_ym, end_ym, country_cd, sgg_cd)


def get_sales_per_visitor(
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 두 데이터에 모두 있는 가장 이른 연월부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 두 데이터에 모두 있는 가장 최근 연월까지 조회"),
    country_cd: str | None = Query(default=None, description="국가 코드(3자리). 예: 392(일본), 158(대만), 156(중국), 840(미국). 생략하면 전체 국가"),
    sgg_cd: str | None = Query(default=None, description="시군구 코드(5자리). 생략하면 부산 전체 구·군"),
):
    return handle_service_error(countries.get_sales_per_visitor, start_ym, end_ym, country_cd, sgg_cd)


def get_monthly_sales_per_visitor(
    country_cd: str = Query(description="조회할 국가 코드(3자리). 예: 392(일본), 158(대만), 156(중국), 840(미국)"),
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 두 데이터에 모두 있는 가장 이른 연월부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 두 데이터에 모두 있는 가장 최근 연월까지 조회"),
    sgg_cd: str | None = Query(default=None, description="시군구 코드(5자리). 생략하면 부산 전체 구·군"),
):
    return handle_service_error(countries.get_monthly_sales_per_visitor, country_cd, start_ym, end_ym, sgg_cd)


def get_sales_per_visitor_distribution(
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM)"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM)"),
):
    return handle_service_error(countries.get_sales_per_visitor_distribution, start_ym, end_ym)


def get_country_visitors_by_sigungu(
    country_cd: str = Query(description="조회할 국가 코드(3자리). 예: 392(일본), 158(대만), 156(중국), 840(미국)"),
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 해당 국가의 가장 이른 데이터부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 해당 국가의 가장 최근 데이터까지 조회"),
):
    return handle_service_error(countries.get_country_visitors_by_sigungu, country_cd, start_ym, end_ym)
