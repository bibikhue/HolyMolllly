from sqlalchemy import text

from db import get_connection


def country_exists(country_cd):
    with get_connection() as connection:
        return connection.execute(
            text("SELECT EXISTS(SELECT 1 FROM countries WHERE country_cd = :country_cd)"),
            {"country_cd": country_cd},
        ).scalar_one() == 1


def get_country_name(country_cd):
    with get_connection() as connection:
        return connection.execute(
            text("SELECT country_nm FROM countries WHERE country_cd = :country_cd"),
            {"country_cd": country_cd},
        ).scalar_one()


def get_period_bounds(country_cd=None, sgg_cd=None):
    query = """
        SELECT MIN(tc.base_ym) AS start_ym, MAX(tc.base_ym) AS end_ym
        FROM tourist_counts AS tc
        JOIN countries AS c ON c.country_id = tc.country_id
        WHERE 1 = 1
    """
    params = {}
    if country_cd is not None:
        query += " AND c.country_cd = :country_cd"
        params["country_cd"] = country_cd
    if sgg_cd is not None:
        query += " AND tc.sgg_cd = :sgg_cd"
        params["sgg_cd"] = sgg_cd

    with get_connection() as connection:
        return dict(connection.execute(text(query), params).mappings().one())


def get_country_summary(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    query = """
        SELECT c.country_cd, c.country_nm, SUM(tc.tourist_cnt) AS tourist_cnt
        FROM tourist_counts AS tc
        JOIN countries AS c ON c.country_id = tc.country_id
        WHERE 1 = 1
    """
    params = {}
    if start_ym is not None:
        query += " AND tc.base_ym >= :start_ym"
        params["start_ym"] = start_ym
    if end_ym is not None:
        query += " AND tc.base_ym <= :end_ym"
        params["end_ym"] = end_ym
    if country_cd is not None:
        query += " AND c.country_cd = :country_cd"
        params["country_cd"] = country_cd
    if sgg_cd is not None:
        query += " AND tc.sgg_cd = :sgg_cd"
        params["sgg_cd"] = sgg_cd
    query += " GROUP BY c.country_id, c.country_cd, c.country_nm ORDER BY tourist_cnt DESC, c.country_nm"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]


def get_sales_period_bounds(country_cd=None, sgg_cd=None):
    query = """
        SELECT MIN(cs.base_ym) AS start_ym, MAX(cs.base_ym) AS end_ym
        FROM country_tourism_spending AS cs
        JOIN countries AS c ON c.country_id = cs.country_id
        WHERE 1 = 1
    """
    params = {}
    if country_cd is not None:
        query += " AND c.country_cd = :country_cd"
        params["country_cd"] = country_cd
    if sgg_cd is not None:
        query += " AND cs.sgg_cd = :sgg_cd"
        params["sgg_cd"] = sgg_cd

    with get_connection() as connection:
        return dict(connection.execute(text(query), params).mappings().one())


def get_country_sales(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    query = """
        SELECT c.country_cd, c.country_nm, SUM(cs.spend_amt) AS sales_amt
        FROM country_tourism_spending AS cs
        JOIN countries AS c ON c.country_id = cs.country_id
        WHERE 1 = 1
    """
    params = {}
    if start_ym is not None:
        query += " AND cs.base_ym >= :start_ym"
        params["start_ym"] = start_ym
    if end_ym is not None:
        query += " AND cs.base_ym <= :end_ym"
        params["end_ym"] = end_ym
    if country_cd is not None:
        query += " AND c.country_cd = :country_cd"
        params["country_cd"] = country_cd
    if sgg_cd is not None:
        query += " AND cs.sgg_cd = :sgg_cd"
        params["sgg_cd"] = sgg_cd
    query += " GROUP BY c.country_id, c.country_cd, c.country_nm ORDER BY sales_amt DESC, c.country_nm"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]


def get_monthly_country_visitors(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    query = """
        SELECT tc.base_ym, c.country_nm, SUM(tc.tourist_cnt) AS tourist_cnt
        FROM tourist_counts AS tc
        JOIN countries AS c ON c.country_id = tc.country_id
        WHERE 1 = 1
    """
    params = {}
    if start_ym is not None:
        query += " AND tc.base_ym >= :start_ym"
        params["start_ym"] = start_ym
    if end_ym is not None:
        query += " AND tc.base_ym <= :end_ym"
        params["end_ym"] = end_ym
    if country_cd is not None:
        query += " AND c.country_cd = :country_cd"
        params["country_cd"] = country_cd
    if sgg_cd is not None:
        query += " AND tc.sgg_cd = :sgg_cd"
        params["sgg_cd"] = sgg_cd
    query += " GROUP BY tc.base_ym, c.country_id, c.country_nm ORDER BY tc.base_ym, c.country_nm"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]


def get_monthly_country_sales(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    query = """
        SELECT cs.base_ym, c.country_nm, SUM(cs.spend_amt) AS sales_amt
        FROM country_tourism_spending AS cs
        JOIN countries AS c ON c.country_id = cs.country_id
        WHERE 1 = 1
    """
    params = {}
    if start_ym is not None:
        query += " AND cs.base_ym >= :start_ym"
        params["start_ym"] = start_ym
    if end_ym is not None:
        query += " AND cs.base_ym <= :end_ym"
        params["end_ym"] = end_ym
    if country_cd is not None:
        query += " AND c.country_cd = :country_cd"
        params["country_cd"] = country_cd
    if sgg_cd is not None:
        query += " AND cs.sgg_cd = :sgg_cd"
        params["sgg_cd"] = sgg_cd
    query += " GROUP BY cs.base_ym, c.country_id, c.country_nm ORDER BY cs.base_ym, c.country_nm"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]


def get_sales_per_visitor_period_bounds(country_cd=None, sgg_cd=None):
    query = """
        SELECT MIN(tc.base_ym) AS start_ym, MAX(tc.base_ym) AS end_ym
        FROM tourist_counts AS tc
        JOIN country_tourism_spending AS cs
          ON cs.base_ym = tc.base_ym AND cs.sgg_cd = tc.sgg_cd AND cs.country_id = tc.country_id
        JOIN countries AS c ON c.country_id = tc.country_id
        WHERE 1 = 1
    """
    params = {}
    if country_cd is not None:
        query += " AND c.country_cd = :country_cd"
        params["country_cd"] = country_cd
    if sgg_cd is not None:
        query += " AND tc.sgg_cd = :sgg_cd"
        params["sgg_cd"] = sgg_cd

    with get_connection() as connection:
        return dict(connection.execute(text(query), params).mappings().one())


def get_sales_per_visitor(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    query = """
        SELECT c.country_cd, c.country_nm, SUM(tc.tourist_cnt) AS tourist_cnt, SUM(cs.spend_amt) AS sales_amt
        FROM tourist_counts AS tc
        JOIN country_tourism_spending AS cs
          ON cs.base_ym = tc.base_ym AND cs.sgg_cd = tc.sgg_cd AND cs.country_id = tc.country_id
        JOIN countries AS c ON c.country_id = tc.country_id
        WHERE 1 = 1
    """
    params = {}
    if start_ym is not None:
        query += " AND tc.base_ym >= :start_ym"
        params["start_ym"] = start_ym
    if end_ym is not None:
        query += " AND tc.base_ym <= :end_ym"
        params["end_ym"] = end_ym
    if country_cd is not None:
        query += " AND c.country_cd = :country_cd"
        params["country_cd"] = country_cd
    if sgg_cd is not None:
        query += " AND tc.sgg_cd = :sgg_cd"
        params["sgg_cd"] = sgg_cd
    query += " GROUP BY c.country_id, c.country_cd, c.country_nm HAVING SUM(tc.tourist_cnt) > 0"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]


def get_monthly_sales_per_visitor(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    return get_sales_per_visitor_distribution(start_ym, end_ym, country_cd, sgg_cd)


def get_sales_per_visitor_distribution(start_ym, end_ym, country_cd=None, sgg_cd=None):
    # Aggregate each source first so missing districts do not change either total.
    query = """
        WITH monthly_visitors AS (
            SELECT base_ym, country_id, SUM(tourist_cnt) AS tourist_cnt
            FROM tourist_counts
            WHERE base_ym BETWEEN :start_ym AND :end_ym
              AND (:sgg_cd IS NULL OR sgg_cd = :sgg_cd)
            GROUP BY base_ym, country_id
        ), monthly_sales AS (
            SELECT base_ym, country_id, SUM(spend_amt) AS sales_amt
            FROM country_tourism_spending
            WHERE base_ym BETWEEN :start_ym AND :end_ym
              AND (:sgg_cd IS NULL OR sgg_cd = :sgg_cd)
            GROUP BY base_ym, country_id
        )
        SELECT v.base_ym, c.country_nm, v.tourist_cnt, s.sales_amt
        FROM monthly_visitors AS v
        JOIN monthly_sales AS s ON s.base_ym = v.base_ym AND s.country_id = v.country_id
        JOIN countries AS c ON c.country_id = v.country_id
        WHERE v.tourist_cnt > 0 AND s.sales_amt > 0
          AND (:country_cd IS NULL OR c.country_cd = :country_cd)
        ORDER BY v.base_ym, c.country_nm
    """
    with get_connection() as connection:
        rows = connection.execute(text(query), {"start_ym": start_ym, "end_ym": end_ym, "country_cd": country_cd, "sgg_cd": sgg_cd}).mappings().all()
    return [dict(row) for row in rows]


def get_country_visitors_by_sigungu(country_cd, start_ym=None, end_ym=None):
    query = """
        SELECT tc.sgg_cd, SUM(tc.tourist_cnt) AS tourist_cnt
        FROM tourist_counts AS tc
        JOIN countries AS c ON c.country_id = tc.country_id
        JOIN sigungu AS s ON s.sgg_cd = tc.sgg_cd
        WHERE c.country_cd = :country_cd AND s.sido_cd = '26'
    """
    params = {"country_cd": country_cd}
    if start_ym is not None:
        query += " AND tc.base_ym >= :start_ym"
        params["start_ym"] = start_ym
    if end_ym is not None:
        query += " AND tc.base_ym <= :end_ym"
        params["end_ym"] = end_ym
    query += " GROUP BY tc.sgg_cd"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]
