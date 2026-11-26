from sqlalchemy import text

from db import get_connection


def get_sigungu(sido_cd=None):
    query = "SELECT sgg_cd, sido_cd, sgg_nm FROM sigungu"
    params = {}
    if sido_cd is not None:
        query += " WHERE sido_cd = :sido_cd"
        params["sido_cd"] = sido_cd
    query += " ORDER BY sido_cd, sgg_nm"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]


def sigungu_exists(sgg_cd):
    with get_connection() as connection:
        return connection.execute(
            text("SELECT EXISTS(SELECT 1 FROM sigungu WHERE sgg_cd = :sgg_cd)"),
            {"sgg_cd": sgg_cd},
        ).scalar_one() == 1
