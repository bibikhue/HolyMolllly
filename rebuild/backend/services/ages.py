import re

from repositories import ages, sigungu
from services.countries import BUSAN_AREAS, validate_filters


def get_ages():
    result = ages.get_ages()
    if result is None:
        raise ValueError(501, "Not implemented")
    return result


def get_age_visitors_by_sigungu(start_ym=None, end_ym=None):
    validate_filters(start_ym, end_ym, None, None)
    if start_ym is None or end_ym is None:
        bounds = ages.get_period_bounds()
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]

    rows = ages.get_age_visitors_by_sigungu(start_ym, end_ym)
    counts = {(row["age_group"], row["sgg_cd"]): row["visitor_cnt"] for row in rows}
    names = {row["sgg_cd"]: row["sgg_nm"] for row in sigungu.get_sigungu("26")}
    age_groups = []
    for age in sorted({row["age_group"] for row in rows}, key=lambda value: int(re.match(r"\d+", value).group())):
        total = sum(count for (group, _), count in counts.items() if group == age)
        groups = []
        for area_name, codes in BUSAN_AREAS:
            districts = []
            for code in codes:
                count = counts.get((age, code), 0)
                districts.append({
                    "sgg_cd": code,
                    "sgg_nm": names[code],
                    "visitor_cnt": count,
                    "share_pct": float(count * 100 / total) if total else 0.0,
                })
            groups.append({"name": area_name, "districts": districts})
        age_groups.append({"age_group": age, "total_visitor_cnt": total, "groups": groups})

    return {"start_ym": start_ym, "end_ym": end_ym, "age_groups": age_groups}
