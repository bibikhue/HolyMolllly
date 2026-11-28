from sqlalchemy import text

from db import get_connection


def get_cluster_inputs(start_ym, end_ym, padded_start, padded_end, sgg_cd):
    params = {"start_ym": start_ym, "end_ym": end_ym, "padded_start": padded_start, "padded_end": padded_end, "sgg_cd": sgg_cd}
    with get_connection() as connection:
        visits = connection.execute(text("""
            SELECT t.base_ym, c.country_cd, c.country_nm, SUM(t.tourist_cnt) AS value
            FROM tourist_counts AS t
            JOIN countries AS c ON c.country_id = t.country_id
            JOIN sigungu AS s ON s.sgg_cd = t.sgg_cd AND s.sido_cd = '26'
            WHERE t.base_ym BETWEEN :padded_start AND :padded_end
              AND (:sgg_cd IS NULL OR t.sgg_cd = :sgg_cd)
              AND c.country_cd IS NOT NULL AND c.country_nm <> '기타'
            GROUP BY t.base_ym, c.country_cd, c.country_nm
        """), params).mappings().all()
        spending = connection.execute(text("""
            SELECT t.base_ym, c.country_cd, SUM(t.spend_amt) AS value
            FROM country_tourism_spending AS t
            JOIN countries AS c ON c.country_id = t.country_id
            JOIN sigungu AS s ON s.sgg_cd = t.sgg_cd AND s.sido_cd = '26'
            WHERE t.base_ym BETWEEN :start_ym AND :end_ym
              AND (:sgg_cd IS NULL OR t.sgg_cd = :sgg_cd)
              AND c.country_cd IS NOT NULL AND c.country_nm <> '기타'
            GROUP BY t.base_ym, c.country_cd
        """), params).mappings().all()
        industries = connection.execute(text("""
            SELECT c.country_cd, i.industry_nm, SUM(f.spend_amt) AS value
            FROM foreign_epay_spending AS f
            JOIN countries AS c ON c.country_id = f.country_id
            JOIN sigungu AS s ON s.sgg_cd = f.sgg_cd AND s.sido_cd = '26'
            JOIN tourism_detail_industries AS d ON d.detail_industry_id = f.detail_industry_id
            JOIN tourism_industries AS i ON i.industry_id = d.industry_id
            WHERE f.base_ym BETWEEN :start_ym AND :end_ym
              AND (:sgg_cd IS NULL OR f.sgg_cd = :sgg_cd)
              AND c.country_cd IS NOT NULL AND c.country_nm <> '기타'
            GROUP BY c.country_cd, i.industry_nm
        """), params).mappings().all()
    return [dict(row) for row in visits], [dict(row) for row in spending], [dict(row) for row in industries]
