from sqlalchemy import text

from db import get_connection


def get_sidos():
    with get_connection() as connection:
        rows = connection.execute(
            text("SELECT sido_cd, sido_nm FROM sidos ORDER BY sido_nm")
        ).mappings().all()
    return [dict(row) for row in rows]


def sido_exists(sido_cd):
    with get_connection() as connection:
        return connection.execute(
            text("SELECT EXISTS(SELECT 1 FROM sidos WHERE sido_cd = :sido_cd)"),
            {"sido_cd": sido_cd},
        ).scalar_one() == 1
