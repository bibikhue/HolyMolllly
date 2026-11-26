from fastapi import Query

from controllers.errors import handle_service_error
from services import sigungu


def get_sigungu(
    sido_cd: str | None = Query(default=None, description="조회할 시도 코드. 생략하면 전체 시군구를 반환합니다. 예: 26(부산)")
):
    return handle_service_error(sigungu.get_sigungu, sido_cd)
