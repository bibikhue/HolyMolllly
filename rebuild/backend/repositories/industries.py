from sqlalchemy import text

from db import get_connection


def get_industries():
    pass


def get_busan_sigungu_name(sgg_cd):
    with get_connection() as connection:
        return connection.execute(
            text("SELECT sgg_nm FROM sigungu WHERE sgg_cd = :sgg_cd AND sido_cd = '26'"),
            {"sgg_cd": sgg_cd},
        ).scalar_one_or_none()


def get_sales_period_bounds(country_cd, sgg_cd):
    with get_connection() as connection:
        return dict(connection.execute(text("""
            SELECT MIN(f.base_ym) AS start_ym, MAX(f.base_ym) AS end_ym
            FROM foreign_epay_spending AS f
            JOIN countries AS c ON c.country_id = f.country_id
            WHERE c.country_cd = :country_cd AND f.sgg_cd = :sgg_cd
        """), {"country_cd": country_cd, "sgg_cd": sgg_cd}).mappings().one())


def get_country_sigungu_sales(country_cd, sgg_cd, start_ym=None, end_ym=None):
    query = """
        SELECT i.industry_nm, SUM(f.spend_amt) AS sales_amt
        FROM foreign_epay_spending AS f
        JOIN countries AS c ON c.country_id = f.country_id
        JOIN tourism_detail_industries AS d ON d.detail_industry_id = f.detail_industry_id
        JOIN tourism_industries AS i ON i.industry_id = d.industry_id
        WHERE c.country_cd = :country_cd AND f.sgg_cd = :sgg_cd
    """
    params = {"country_cd": country_cd, "sgg_cd": sgg_cd}
    if start_ym is not None:
        query += " AND f.base_ym >= :start_ym"
        params["start_ym"] = start_ym
    if end_ym is not None:
        query += " AND f.base_ym <= :end_ym"
        params["end_ym"] = end_ym
    query += " GROUP BY i.industry_id, i.industry_nm ORDER BY sales_amt DESC, i.industry_nm"

    with get_connection() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]
