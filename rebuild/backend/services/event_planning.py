import re
from collections import defaultdict
from statistics import median, quantiles

from fastapi.encoders import jsonable_encoder

from repositories import sigungu, visit_patterns
from services import ages, countries, country_clusters, industries


def retrieve(question, filters):
    period = filters.get("period") or {}
    if not isinstance(period, dict):
        raise ValueError(400, "행사 기획 조회 기간을 확인해 주세요.")
    start, end = period.get("start_ym"), period.get("end_ym")
    district, country = filters.get("district"), filters.get("country")
    if not all(value is None or isinstance(value, str) for value in (start, end, district, country)):
        raise ValueError(400, "행사 기획 조회 조건을 확인해 주세요.")
    countries.validate_filters(start, end, country, district)
    districts = sigungu.get_sigungu("26")
    if district and not any(row["sgg_cd"] == district for row in districts):
        raise ValueError(400, "부산 구·군을 선택해 주세요.")
    # UI selections are analysis filters, never an agreement about the event location.
    named = sorted([row for row in districts if row["sgg_nm"] in question and not re.match(r".{0,6}(?:말고|제외|아니|안\s*했|정하지\s*않)", question[question.rfind(row["sgg_nm"]) + len(row["sgg_nm"]):])], key=lambda row: question.rfind(row["sgg_nm"]))
    district = None
    if named:
        district = named[-1]["sgg_cd"]
    if "부산 전체" in question and (not named or question.rfind("부산 전체") > question.rfind(named[-1]["sgg_nm"])):
        district = None
    district_name = next((row["sgg_nm"] for row in districts if row["sgg_cd"] == district), "부산 전체")
    location_confirmed = bool(named) and district is not None
    domestic_mentions = list(re.finditer(r"외지인|내국인|국내 관광객", question))
    foreign_mentions = list(re.finditer(r"외국인|국가별|일본|중국|대만|미국|국적", question))
    demographic_target = bool(re.search(r"\d{1,2}대|여성|여자|남성|남자", question))
    domestic_only = (bool(domestic_mentions) or demographic_target) and (not foreign_mentions or bool(domestic_mentions) and domestic_mentions[-1].start() > foreign_mentions[-1].start())
    if domestic_only:
        # Domestic age/gender questions must not be grounded in foreign-country spending.
        bounds = ages.get_age_visitors_by_sigungu(start, end)
        start, end = bounds["start_ym"], bounds["end_ym"]
        scope = district if location_confirmed else None
        rows = visit_patterns.get_demographic_visitors(start, end, scope)
        age_matches = re.findall(r"(\d{1,2})대", question)
        age = int(age_matches[-1]) if age_matches else None
        gender_matches = [(question.rfind(word), value) for word, value in (("여성", "여성"), ("여자", "여성"), ("남성", "남성"), ("남자", "남성")) if word in question]
        gender = max(gender_matches)[1] if gender_matches else None
        selected = [row for row in rows if (age is None or int(re.search(r"\d+", row["age_group"]).group()) == age) and (gender is None or row["gender"] == gender)]
        district_totals = defaultdict(int)
        for row in rows:
            district_totals[row["sgg_cd"]] += row["visitor_cnt"]
        targets = {}
        for row in selected:
            item = targets.setdefault(row["sgg_cd"], {"sgg_cd": row["sgg_cd"], "sgg_nm": row["sgg_nm"], "target_visit_count": 0})
            item["target_visit_count"] += row["visitor_cnt"]
        for code, item in targets.items():
            item["target_share_of_district_visits_pct"] = float(item["target_visit_count"] / district_totals[code] * 100) if district_totals[code] else 0
        candidates = sorted(targets.values(), key=lambda item: item["target_visit_count"], reverse=True)[:6] if not location_confirmed else []
        return jsonable_encoder({"mode": "event_planning", "audience": {"type": "외지인" if domestic_mentions else "국적 미정, 비교 자료는 외지인 방문 기준", "age": age, "gender": gender}, "location_confirmed": location_confirmed, "location_candidates": candidates, "candidate_basis": "대상 성별·연령의 누적 방문 건수 순. 행사 적합도 확정이나 계절 수요 예측이 아님.", "period": {"start_ym": start, "end_ym": end}, "scope": district_name if location_confirmed else "행사 지역 미정", "documents": [{"id": "D1", "source": "외지인 성별·연령별 방문 현황", "title": "대상 성별·연령의 구·군별 누적 방문", "data": {"unit": "누적 방문 건수(중복 방문 포함, 실인원·행사 참가자 수 아님)", "gender_available": True, "seasonality_available": False, "rows": selected}}]})

    visits = countries.get_country_summary(start, end)
    start, end = visits["start_ym"], visits["end_ym"]
    sales = countries.get_country_sales(start, end)
    per_visitor = countries.get_sales_per_visitor(start, end)
    documents = []

    def add(source, title, data, tags="", priority=0):
        documents.append({"id": f"P{len(documents) + 1}", "source": source, "title": title, "data": data, "tags": tags, "priority": priority})

    add("국가별 방문 및 소비 · 기본", "부산 전체 국가별 누적 방문·소비", {"period": [start, end], "visits_unit": "명", "sales_unit": "원", "visits": visits["data"], "sales": sales["data"]}, priority=100)
    add("국가별 방문 및 소비 · 기본", "국가별 방문당 관광소비액", {"unit": "원/방문객", "data": per_visitor["data"]}, "소비 지출 예산", 30)
    distribution = []
    for row in countries.get_sales_per_visitor_distribution(start, end)["data"]:
        values = sorted(row["values"])
        if not values:
            continue
        q1, _, q3 = quantiles(values, n=4, method="inclusive") if len(values) > 1 else [values[0]] * 3
        iqr = q3 - q1
        inside = [value for value in values if q1 - 1.5 * iqr <= value <= q3 + 1.5 * iqr]
        distribution.append({"country": row["country_nm"], "median": median(values), "q1": q1, "q3": q3, "lower_whisker": inside[0], "upper_whisker": inside[-1], "month_count": len(values)})
    add("국가별 방문 및 소비 · 기본", "월별 방문당 관광소비액 분포", {"unit": "원/방문객", "data": distribution}, "중앙값 소비 분포 고소비", 25)
    demographics = ages.get_age_visitors_by_sigungu(start, end)
    age_rows = [{"age_group": row["age_group"], "total_visit_count": row["total_visitor_cnt"], "districts": [item for group in row["groups"] for item in group["districts"] if not district or item["sgg_cd"] == district]} for row in demographics["age_groups"]]
    add("국가별 방문 및 소비 · 상세", f"{district_name} 연령대별 외지인 방문", {"unit": "방문 건수", "data": age_rows}, "연령 청년 가족 아동 중장년 외지인", 40)
    names = {row["country_cd"]: row["country_nm"] for row in visits["data"] if row["country_cd"]}
    matched_countries = sorted([code for code, name in names.items() if name in question], key=lambda code: question.rfind(names[code]), reverse=True)
    selected = matched_countries[:4] or ([country] if country in names else [])
    if not selected:
        selected = [row["country_cd"] for row in visits["data"][:3] if row["country_cd"]]

    scopes = [None, district] if district else [None]
    for scope in scopes:
        scope_name = district_name if scope else "부산 전체"
        try:
            clustered = country_clusters.get_country_clusters(start, end, scope)
            for cluster in clustered["clusters"]:
                members = [{key: row[key] for key in ("country_nm", "visits_2025", "growth_pct", "spend_per_visit")} for row in clustered["data"] if row["country_nm"] in cluster["countries"]]
                add("국가별 특성 유형화", f"{scope_name} {cluster['name']}", {"scope": scope_name, "period": [start, end], "countries": cluster["countries"], "country_metrics": members, "profile": cluster["profile"], "method": clustered["method"], "units": {"season_index": "평균 100", "growth_profile_value": "ln(2025/2024)", "spend_profile_value": "ln(원/방문객)", "industry_profile_value": "%", "standardized": "표준화 점수, 전체 국가 평균 0", "spend_per_visit": "원/방문객", "growth_pct": "%", "visits_2025": "명"}}, "군집 유형 특성 계절 봄 여름 가을 겨울 쇼핑 숙박 식음료 의료", 45)
        except ValueError as error:
            if len(error.args) != 2 or error.args[0] != 400:
                raise
            add("국가별 특성 유형화", f"{scope_name} 유형화 자료 이용 제한", {"reason": error.args[1]}, priority=90)

    for code in selected:
        monthly_visits = countries.get_monthly_country_visitors(start, end, code, district)["data"]
        monthly_sales = countries.get_monthly_country_sales(start, end, code, district)["data"]
        # Seasonal comparisons retain monthly totals and the number of contributing months.
        seasons = defaultdict(lambda: {"visits": 0, "sales_won": 0, "visit_months": 0, "sales_months": 0})
        for row in monthly_visits:
            item = seasons[row["base_ym"][5:]]
            item["visits"] += row["tourist_cnt"]
            item["visit_months"] += 1
        for row in monthly_sales:
            item = seasons[row["base_ym"][5:]]
            item["sales_won"] += row["sales_amt"]
            item["sales_months"] += 1
        month_values = sorted({row["base_ym"] for row in monthly_visits + monthly_sales})
        visits_by_month = {row["base_ym"]: row["tourist_cnt"] for row in monthly_visits}
        sales_by_month = {row["base_ym"]: row["sales_amt"] for row in monthly_sales}
        add("국가별 방문 및 소비 · 기본", f"{district_name} {names.get(code, code)} 월별 방문·소비", {"period": [start, end], "scope": district_name, "monthly": {"months": month_values, "visits": [visits_by_month.get(month) for month in month_values], "sales_won": [sales_by_month.get(month) for month in month_values]}, "calendar_month_totals": dict(sorted(seasons.items())), "note": "calendar_month_totals는 같은 달의 여러 연도 합계이며 월별 표본 수가 다를 수 있음"}, names.get(code, ""), 65)
        regions = countries.get_country_visitors_by_sigungu(code, start, end)
        add("국가별 방문 및 소비 · 상세", f"{names.get(code, code)} 구·군별 방문 비율", regions, "지역 상권 입지 " + names.get(code, ""), 50)
        if district:
            composition = industries.get_country_sigungu_sales(code, district, start, end)
            add("국가별 방문 및 소비 · 상세", f"{district_name} {names.get(code, code)} 업종별 간편결제 관광소비", {"unit": "천원", "result": composition}, "업종 소비 쇼핑 숙박 식음료 " + names.get(code, ""), 60)

    terms = set(re.findall(r"[가-힣A-Za-z0-9]{2,}", question))
    def score(document):
        searchable = document["title"] + " " + document["tags"] + " " + str(document["data"])
        keywords = ("중앙값", "분포", "연령", "가족", "봄", "여름", "가을", "겨울", "쇼핑", "숙박", "식음료", "의료", "군집", "유형")
        return document["priority"] + sum(8 for term in terms if term in searchable) + sum(20 for term in keywords if term in question and term in searchable)
    ranked = sorted(documents, key=score, reverse=True)[:20]
    for item in ranked:
        item.pop("priority")
        item.pop("tags")
    return jsonable_encoder({"mode": "event_planning", "location_confirmed": location_confirmed, "retrieval": "DB 자료의 지역·국가 필터와 질문 키워드 기반 검색", "period": {"start_ym": start, "end_ym": end}, "scope": district_name, "documents": ranked})
