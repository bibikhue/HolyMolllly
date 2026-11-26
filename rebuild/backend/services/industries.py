from repositories import countries, industries
from services.countries import validate_filters


def get_industries():
    result = industries.get_industries()
    if result is None:
        raise ValueError(501, "Not implemented")
    return result


def get_country_sigungu_sales(country_cd, sgg_cd, start_ym=None, end_ym=None):
    validate_filters(start_ym, end_ym, country_cd, sgg_cd)
    sgg_nm = industries.get_busan_sigungu_name(sgg_cd)
    if sgg_nm is None:
        raise ValueError(400, "부산 구·군 코드가 아닙니다.")
    if start_ym is None or end_ym is None:
        bounds = industries.get_sales_period_bounds(country_cd, sgg_cd)
        start_ym = start_ym if start_ym is not None else bounds["start_ym"]
        end_ym = end_ym if end_ym is not None else bounds["end_ym"]

    data = industries.get_country_sigungu_sales(country_cd, sgg_cd, start_ym, end_ym)
    total = sum(row["sales_amt"] for row in data)
    for row in data:
        row["share_pct"] = float(row["sales_amt"] * 100 / total) if total else 0.0
    return {
        "country_nm": countries.get_country_name(country_cd),
        "sgg_cd": sgg_cd,
        "sgg_nm": sgg_nm,
        "start_ym": start_ym,
        "end_ym": end_ym,
        "unit": "천원",
        "data": data,
    }
