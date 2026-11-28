from math import isfinite, log

from repositories import country_clusters, sigungu
from services.countries import validate_filters


FEATURE_NAMES = ["봄 방문 지수", "여름 방문 지수", "가을 방문 지수", "겨울 방문 지수", "방문 성장률", "방문당 소비액", "쇼핑 비중", "식음료 비중", "숙박 비중", "여가서비스 비중", "의료웰니스 비중"]
INDUSTRIES = ["쇼핑업", "식음료업", "숙박업", "여가서비스업", "의료웰니스업"]
CLUSTER_COLORS = ["#7183bd", "#e89564", "#55afa5", "#ac86cb"]


def shift_month(ym, offset):
    year, month = map(int, ym.split("-"))
    year, month = divmod(year * 12 + month - 1 + offset, 12)
    return f"{year:04d}-{month + 1:02d}"


def month_range(start, end):
    result = []
    while start <= end:
        result.append(start)
        start = shift_month(start, 1)
    return result


def get_country_clusters(start_ym, end_ym, sgg_cd=None):
    validate_filters(start_ym, end_ym, None, sgg_cd)
    if start_ym > "2024-01" or end_ym < "2025-12":
        raise ValueError(400, "성장률 비교를 위해 조회 기간에 2024년과 2025년 전체를 포함해 주세요.")
    scope = "부산 전체"
    if sgg_cd:
        district = next((row for row in sigungu.get_sigungu("26") if row["sgg_cd"] == sgg_cd), None)
        if district is None:
            raise ValueError(400, "부산 구·군을 선택해 주세요.")
        scope = district["sgg_nm"]
    padded_start, padded_end = shift_month(start_ym, -6), shift_month(end_ym, 6)
    visit_rows, spending_rows, industry_rows = country_clusters.get_cluster_inputs(start_ym, end_ym, padded_start, padded_end, sgg_cd)
    countries, spending, industries = {}, {}, {}
    for row in visit_rows:
        item = countries.setdefault(row["country_cd"], {"name": row["country_nm"], "visits": {}})
        item["visits"][row["base_ym"]] = float(row["value"])
    for row in spending_rows:
        spending.setdefault(row["country_cd"], {})[row["base_ym"]] = float(row["value"])
    for row in industry_rows:
        industries.setdefault(row["country_cd"], {})[row["industry_nm"]] = float(row["value"])
    months = month_range(start_ym, end_ym)
    samples, excluded = [], []
    for code, country in sorted(countries.items()):
        visits = country["visits"]
        complete_years = all(f"{year}-{month:02d}" in visits for year in (2024, 2025) for month in range(1, 13))
        total_2024 = sum(visits.get(f"2024-{month:02d}", 0) for month in range(1, 13))
        total_2025 = sum(visits.get(f"2025-{month:02d}", 0) for month in range(1, 13))
        season_values = [[], [], [], []]
        for ym in months:
            window = [visits.get(shift_month(ym, offset)) for offset in range(-6, 7)]
            if any(value is None for value in window):
                continue
            moving_average = (window[0] / 2 + sum(window[1:-1]) + window[-1] / 2) / 12
            if moving_average <= 0:
                continue
            month = int(ym[5:])
            season = 0 if 3 <= month <= 5 else 1 if 6 <= month <= 8 else 2 if 9 <= month <= 11 else 3
            season_values[season].append(visits[ym] / moving_average * 100)
        matched = [ym for ym in months if visits.get(ym, 0) > 0 and ym in spending.get(code, {})]
        total_spending = sum(spending[code][ym] for ym in matched)
        total_visits = sum(visits[ym] for ym in matched)
        industry_total = sum(industries.get(code, {}).values())
        if not complete_years or total_2024 <= 0 or total_2025 <= 0 or not all(season_values) or total_spending <= 0 or total_visits <= 0 or industry_total <= 0:
            excluded.append(country["name"])
            continue
        seasonal = [sum(values) / len(values) for values in season_values]
        seasonal_mean = sum(seasonal) / 4
        shares = [industries[code].get(name, 0) / industry_total * 100 for name in INDUSTRIES]
        spend_per_visit = total_spending / total_visits
        values = [value / seasonal_mean * 100 for value in seasonal] + [log(total_2025 / total_2024), log(spend_per_visit)] + shares
        if all(isfinite(value) for value in values):
            samples.append({"country_cd": code, "country_nm": country["name"], "visits_2025": int(total_2025), "growth_pct": (total_2025 / total_2024 - 1) * 100, "spend_per_visit": spend_per_visit, "values": values})
        else:
            excluded.append(country["name"])
    if len(samples) < 4:
        raise ValueError(400, "해당 조건에서 11개 지표를 계산할 수 있는 국가가 4개 미만입니다.")

    import numpy as np
    from sklearn.cluster import KMeans
    from sklearn.decomposition import PCA
    from sklearn.preprocessing import StandardScaler
    from threadpoolctl import threadpool_limits

    features = np.array([sample["values"] for sample in samples])
    scaled = StandardScaler().fit_transform(features)
    if len(np.unique(scaled, axis=0)) < 4:
        raise ValueError(400, "서로 다른 국가 특성이 4개 미만이라 4개 군집으로 나눌 수 없습니다.")
    with threadpool_limits(limits=1):
        model = KMeans(n_clusters=4, n_init=50, random_state=42).fit(scaled)
        pca = PCA(n_components=2, svd_solver="full").fit(scaled)
        coordinates = pca.transform(scaled)
    # Orient the axes consistently; only the sign changes, not distances or clusters.
    anchors = [np.array([0, -1, 0, 0, 0, 0, -1, 1, 1, 0, 0]), np.array([0, -1, 0, 1, -1, -1, 0, 0, 0, 0, 0])]
    for axis, anchor in enumerate(anchors):
        if np.dot(pca.components_[axis], anchor) < 0:
            coordinates[:, axis] *= -1
            pca.components_[axis] *= -1
    centers = model.cluster_centers_
    clusters = []
    for group in range(4):
        members = [index for index, label in enumerate(model.labels_) if int(label) == group]
        higher = sorted([column for column in range(11) if centers[group, column] > 0], key=lambda column: -centers[group, column])[:3]
        clusters.append({"id": group, "name": f"군집 {group + 1}", "color": CLUSTER_COLORS[group], "countries": [samples[index]["country_nm"] for index in members],
                         "higher_features": [{"name": FEATURE_NAMES[column], "z_score": float(centers[group, column])} for column in higher],
                         "profile": [{"name": name, "value": float(features[members, column].mean()), "standardized": float(centers[group, column])} for column, name in enumerate(FEATURE_NAMES)]})
        for index in members:
            samples[index].update({"cluster": group, "x": float(coordinates[index, 0]), "y": float(coordinates[index, 1])})
    axes = []
    for axis in range(2):
        component = pca.components_[axis]
        negative = sorted([i for i in range(11) if component[i] < 0], key=lambda i: component[i])[:2]
        positive = sorted([i for i in range(11) if component[i] > 0], key=lambda i: -component[i])[:2]
        axes.append({"negative": [FEATURE_NAMES[i] for i in negative], "positive": [FEATURE_NAMES[i] for i in positive], "explained_pct": float(pca.explained_variance_ratio_[axis] * 100)})
    return {"scope": scope, "start_ym": start_ym, "end_ym": end_ym, "growth_years": [2024, 2025], "bubble_year": 2025,
            "feature_names": FEATURE_NAMES, "clusters": clusters, "axes": axes, "data": samples, "excluded": excluded,
            "method": {"clusters": 4, "n_init": 50, "random_state": 42, "standardization": "StandardScaler", "projection": "PCA", "industry_source": "간편결제 소비", "growth_transform": "ln(2025년 방문/2024년 방문)", "spend_transform": "ln(관광소비액/방문객 수)", "seasonal_average": "중심화 12개월 이동평균(2×12), 계절 지수 평균 100"}}
