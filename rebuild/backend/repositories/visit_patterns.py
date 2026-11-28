from sqlalchemy import text

from db import get_connection


def get_demographic_visitors(start_ym, end_ym, sgg_cd=None):
    with get_connection() as connection:
        rows = connection.execute(text("""
            SELECT d.sgg_cd, s.sgg_nm, d.age_group, d.gender, SUM(d.visitor_cnt) AS visitor_cnt
            FROM visitor_demographics AS d
            JOIN sigungu AS s ON s.sgg_cd = d.sgg_cd
            WHERE s.sido_cd = '26' AND d.base_ym BETWEEN :start AND :end
              AND (:district IS NULL OR d.sgg_cd = :district)
            GROUP BY d.sgg_cd, s.sgg_nm, d.age_group, d.gender
        """), {"start": start_ym, "end": end_ym, "district": sgg_cd}).mappings().all()
    return [dict(row) for row in rows]


def get_visit_patterns(sgg_cd, start_ym, end_ym):
    params = {"sgg_cd": sgg_cd, "start_ym": start_ym, "end_ym": end_ym}
    with get_connection() as connection:
        demographics = connection.execute(text("""
            SELECT age_group, gender, SUM(visitor_cnt) AS visitor_cnt
            FROM visitor_demographics
            WHERE sgg_cd = :sgg_cd AND base_ym BETWEEN :start_ym AND :end_ym
            GROUP BY age_group, gender
        """), params).mappings().all()
        attractions = connection.execute(text("""
            SELECT t.content_id, c.content_nm, t.language, SUM(t.visitor_cnt) AS visitor_cnt
            FROM tourism_interest_counts AS t
            JOIN tourism_contents AS c ON c.content_id = t.content_id
            WHERE t.sgg_cd = :sgg_cd AND t.base_ym BETWEEN :start_ym AND :end_ym
            GROUP BY t.content_id, c.content_nm, t.language
        """), params).mappings().all()
    return [dict(row) for row in demographics], [dict(row) for row in attractions]


def get_region_visitor_comparison(start_ym, end_ym):
    params = {"start_ym": start_ym, "end_ym": end_ym}
    with get_connection() as connection:
        domestic = connection.execute(text("""
            SELECT d.sgg_cd, SUM(d.visitor_cnt) AS visitor_cnt
            FROM visitor_demographics AS d
            JOIN sigungu AS s ON s.sgg_cd = d.sgg_cd
            WHERE s.sido_cd = '26' AND d.base_ym BETWEEN :start_ym AND :end_ym
            GROUP BY d.sgg_cd
        """), params).mappings().all()
        foreign = connection.execute(text("""
            SELECT t.sgg_cd, c.country_cd, SUM(t.tourist_cnt) AS visitor_cnt
            FROM tourist_counts AS t
            JOIN countries AS c ON c.country_id = t.country_id
            JOIN sigungu AS s ON s.sgg_cd = t.sgg_cd
            WHERE s.sido_cd = '26' AND t.base_ym BETWEEN :start_ym AND :end_ym
            GROUP BY t.sgg_cd, c.country_cd
        """), params).mappings().all()
    return [dict(row) for row in domestic], [dict(row) for row in foreign]
