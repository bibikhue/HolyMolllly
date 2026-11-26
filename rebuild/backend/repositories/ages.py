from sqlalchemy import text

from db import get_connection


def get_ages():
    pass


def get_period_bounds():
    with get_connection() as connection:
        return dict(connection.execute(text("""
            SELECT MIN(base_ym) AS start_ym, MAX(base_ym) AS end_ym
            FROM visitor_demographics
        """)).mappings().one())


def get_age_visitors_by_sigungu(start_ym=None, end_ym=None):
    query = """
        SELECT d.age_group, d.sgg_cd, SUM(d.visitor_cnt) AS visitor_cnt
        FROM visitor_demographics AS d
        JOIN sigungu AS s ON s.sgg_cd = d.sgg_cd
        WHERE s.sido_cd = '26'
    """
    params = {}
    if start_ym is not None:
        query += " AND d.base_ym >= :start_ym"
        params["start_ym"] = start_ym
    if end_ym is not None:
        query += " AND d.base_ym <= :end_ym"
        params["end_ym"] = end_ym
    query += " GROUP BY d.age_group, d.sgg_cd"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]
