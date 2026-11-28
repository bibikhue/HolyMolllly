import re

from repositories import sigungu, visit_patterns
from services.countries import BUSAN_AREAS, validate_filters


def get_visit_patterns(sgg_cd, start_ym, end_ym):
    validate_filters(start_ym, end_ym, None, sgg_cd)
    district = next((item for item in sigungu.get_sigungu("26") if item["sgg_cd"] == sgg_cd), None)
    if district is None:
        raise ValueError(400, "부산 구·군을 선택해 주세요.")
    if start_ym is None or end_ym is None:
        raise ValueError(400, "시작월과 종료월을 선택해 주세요.")
    demographics, rows = visit_patterns.get_visit_patterns(sgg_cd, start_ym, end_ym)
    demographics.sort(key=lambda row: (int(re.search(r"\d+", row["age_group"]).group()), row["gender"]))
    grouped = {}
    for row in rows:
        item = grouped.setdefault(row["content_id"], {
            "content_id": row["content_id"], "content_nm": row["content_nm"], "counts": {}, "total": 0,
        })
        count = int(row["visitor_cnt"])
        item["counts"][row["language"]] = count
        item["total"] += count
    attractions = sorted(grouped.values(), key=lambda item: (-item["total"], item["content_id"]))[:10]
    return {
        "sgg_cd": sgg_cd, "sgg_nm": district["sgg_nm"], "start_ym": start_ym, "end_ym": end_ym,
        "demographics": demographics, "attractions": attractions,
    }


def get_region_visitor_comparison(start_ym, end_ym):
    validate_filters(start_ym, end_ym, None, None)
    if start_ym is None or end_ym is None:
        raise ValueError(400, "시작월과 종료월을 선택해 주세요.")
    domestic, foreign = visit_patterns.get_region_visitor_comparison(start_ym, end_ym)
    domestic_counts = {row["sgg_cd"]: int(row["visitor_cnt"]) for row in domestic}
    foreign_counts = {}
    country_labels = {"158": "대만", "156": "중국", "392": "일본", "840": "미국"}
    for row in foreign:
        counts = foreign_counts.setdefault(row["sgg_cd"], {})
        label = country_labels.get(row["country_cd"], "기타")
        counts[label] = counts.get(label, 0) + int(row["visitor_cnt"])
    names = {row["sgg_cd"]: row["sgg_nm"] for row in sigungu.get_sigungu("26")}
    return {
        "start_ym": start_ym, "end_ym": end_ym,
        "groups": [{"name": name, "districts": [{
            "sgg_cd": code, "sgg_nm": names[code], "domestic_cnt": domestic_counts.get(code, 0),
            "foreign_counts": foreign_counts.get(code, {}),
            "foreign_total": sum(foreign_counts.get(code, {}).values()),
        } for code in codes]} for name, codes in BUSAN_AREAS],
    }
