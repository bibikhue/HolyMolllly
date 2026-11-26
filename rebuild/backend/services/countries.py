import re

from repositories import countries, sigungu


BUSAN_AREAS = (
    ("원도심", ("26110", "26140", "26170", "26200")),
    ("중부산", ("26230", "26290", "26500", "26470")),
    ("서부산", ("26320", "26380", "26440", "26530")),
    ("동부산", ("26410", "26260", "26350", "26710")),
)


def validate_filters(start_ym, end_ym, country_cd, sgg_cd):
    if any(ym is not None and not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", ym) for ym in (start_ym, end_ym)):
        raise ValueError(400, "연월은 YYYY-MM 형식이어야 합니다.")
    if start_ym is not None and end_ym is not None and start_ym > end_ym:
        raise ValueError(400, "시작 연월은 끝 연월보다 늦을 수 없습니다.")
    if country_cd is not None and not countries.country_exists(country_cd):
        raise ValueError(400, "존재하지 않는 국가 코드입니다.")
    if sgg_cd is not None and not sigungu.sigungu_exists(sgg_cd):
        raise ValueError(400, "존재하지 않는 시군구 코드입니다.")


def get_country_summary(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    validate_filters(start_ym, end_ym, country_cd, sgg_cd)
    if start_ym is None or end_ym is None:
        bounds = countries.get_period_bounds(country_cd, sgg_cd)
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]
    data = countries.get_country_summary(start_ym, end_ym, country_cd, sgg_cd)
    total = sum(row["tourist_cnt"] for row in data)
    for row in data:
        row["share_pct"] = float(row["tourist_cnt"] * 100 / total) if total else 0.0
    return {
        "start_ym": start_ym,
        "end_ym": end_ym,
        "data": data,
    }


def get_country_sales(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    validate_filters(start_ym, end_ym, country_cd, sgg_cd)
    if start_ym is None or end_ym is None:
        bounds = countries.get_sales_period_bounds(country_cd, sgg_cd)
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]
    data = countries.get_country_sales(start_ym, end_ym, country_cd, sgg_cd)
    total = sum(row["sales_amt"] for row in data)
    for row in data:
        row["share_pct"] = float(row["sales_amt"] * 100 / total) if total else 0.0
    return {"start_ym": start_ym, "end_ym": end_ym, "data": data}


def add_monthly_share(data, value_key):
    monthly_totals = {}
    for row in data:
        month = row["base_ym"]
        monthly_totals[month] = monthly_totals.get(month, 0) + row[value_key]
    for row in data:
        total = monthly_totals[row["base_ym"]]
        row["share_pct"] = float(row[value_key] * 100 / total) if total else 0.0
    return data


def get_monthly_country_visitors(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    validate_filters(start_ym, end_ym, country_cd, sgg_cd)
    if start_ym is None or end_ym is None:
        bounds = countries.get_period_bounds(country_cd, sgg_cd)
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]
    data = countries.get_monthly_country_visitors(start_ym, end_ym, country_cd, sgg_cd)
    return {"start_ym": start_ym, "end_ym": end_ym, "data": add_monthly_share(data, "tourist_cnt")}


def get_monthly_country_sales(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    validate_filters(start_ym, end_ym, country_cd, sgg_cd)
    if start_ym is None or end_ym is None:
        bounds = countries.get_sales_period_bounds(country_cd, sgg_cd)
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]
    data = countries.get_monthly_country_sales(start_ym, end_ym, country_cd, sgg_cd)
    return {"start_ym": start_ym, "end_ym": end_ym, "data": add_monthly_share(data, "sales_amt")}


def get_sales_per_visitor(start_ym=None, end_ym=None, country_cd=None, sgg_cd=None):
    validate_filters(start_ym, end_ym, country_cd, sgg_cd)
    if start_ym is None or end_ym is None:
        bounds = countries.get_sales_per_visitor_period_bounds(country_cd, sgg_cd)
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]
    data = countries.get_sales_per_visitor(start_ym, end_ym, country_cd, sgg_cd)
    for row in data:
        row["sales_per_visitor"] = float(row["sales_amt"] / row["tourist_cnt"])
    data.sort(key=lambda row: row["sales_per_visitor"], reverse=True)
    return {"start_ym": start_ym, "end_ym": end_ym, "data": data}


def get_monthly_sales_per_visitor(country_cd, start_ym=None, end_ym=None, sgg_cd=None):
    validate_filters(start_ym, end_ym, country_cd, sgg_cd)
    if start_ym is None or end_ym is None:
        bounds = countries.get_sales_per_visitor_period_bounds(country_cd, sgg_cd)
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]

    rows = countries.get_monthly_sales_per_visitor(start_ym, end_ym, country_cd, sgg_cd)
    series_by_year = {}
    for row in rows:
        year, month = map(int, row["base_ym"].split("-"))
        if year not in series_by_year:
            series_by_year[year] = {
                "year": year,
                "months": list(range(1, 13)),
                "sales_per_visitor": [None] * 12,
            }
        series_by_year[year]["sales_per_visitor"][month - 1] = float(
            row["sales_amt"] / row["tourist_cnt"]
        )

    return {
        "country_nm": rows[0]["country_nm"] if rows else countries.get_country_name(country_cd),
        "start_ym": start_ym,
        "end_ym": end_ym,
        "series": list(series_by_year.values()),
    }


def get_country_visitors_by_sigungu(country_cd, start_ym=None, end_ym=None):
    validate_filters(start_ym, end_ym, country_cd, None)
    if start_ym is None or end_ym is None:
        bounds = countries.get_period_bounds(country_cd)
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]

    counts = {
        row["sgg_cd"]: row["tourist_cnt"]
        for row in countries.get_country_visitors_by_sigungu(country_cd, start_ym, end_ym)
    }
    names = {row["sgg_cd"]: row["sgg_nm"] for row in sigungu.get_sigungu("26")}
    total = sum(counts.values())
    groups = []
    for area_name, codes in BUSAN_AREAS:
        districts = []
        for code in codes:
            count = counts.get(code, 0)
            districts.append({
                "sgg_cd": code,
                "sgg_nm": names[code],
                "tourist_cnt": count,
                "share_pct": float(count * 100 / total) if total else 0.0,
            })
        groups.append({"name": area_name, "districts": districts})

    return {
        "country_nm": countries.get_country_name(country_cd),
        "start_ym": start_ym,
        "end_ym": end_ym,
        "total_tourist_cnt": total,
        "groups": groups,
    }
