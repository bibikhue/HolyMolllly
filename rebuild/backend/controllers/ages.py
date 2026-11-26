from fastapi import Query

from controllers.errors import handle_service_error
from services import ages


def get_ages():
    return handle_service_error(ages.get_ages)


def get_age_visitors_by_sigungu(
    start_ym: str | None = Query(default=None, description="시작 연월(YYYY-MM). 생략하면 가장 이른 데이터부터 조회"),
    end_ym: str | None = Query(default=None, description="끝 연월(YYYY-MM). 생략하면 가장 최근 데이터까지 조회"),
):
    return handle_service_error(ages.get_age_visitors_by_sigungu, start_ym, end_ym)
