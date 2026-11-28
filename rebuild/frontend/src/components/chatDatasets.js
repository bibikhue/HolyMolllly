import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const datasets = new Map();
export const CHAT_DATA_EVENT = "chat-datasets-updated";

export function graphCoverage(id) {
  const graph = (category, basic, detail) => [
    ...basic.map((name) => ({ category, view: "basic", name })),
    ...detail.map((name) => ({ category, view: "detail", name })),
  ];
  if (id === "owners-region-visitors") return graph("visits", ["권역별 구·군 외지인 방문", "권역별 구·군 국가별 외국인 방문"], []);
  if (id === "owners-visit-detail") return graph("visits", [], ["구·군 연령별 방문 비율", "성별·연령별 누적 방문", "언어권별 관심 관광지"]);
  if (id === "owners-sales") return graph("sales", ["구·군 간편결제 소비 지도", "국적별 월간 간편결제 소비"], ["국적별 소비 규모", "업종별 간편결제 소비 구성"]);
  if (id === "owners-per-visitor") return graph("sales", ["연도별 월간 1인당 관광소비"], []);
  if (id === "policy-visits") return graph("visits", ["국가별 누적 방문 비중", "1인당 관광소비액 분포", "국가별 월별 방문"], []);
  if (id === "policy-sales") return graph("sales", ["국가별 누적 소비 비중", "1인당 관광소비액 분포", "국가별 월별 소비"], []);
  if (id === "policy-district-visits") return graph("visits", [], ["국가별 구·군 방문 비율"]);
  if (id === "policy-age-district") return graph("visits", [], ["연령별 구·군 방문 비율"]);
  if (id === "policy-per-visitor") return graph("sales", [], ["연도별 월간 1인당 관광소비"]);
  if (id.startsWith("policy-industry-")) return graph("sales", [], ["국가·구군별 업종별 간편결제 소비"]);
  if (id.startsWith("country-types-")) return ["국가별 방문·소비 유형 비교", "군집별 평균 지표 비교"].map((name) => ({ category: "types", view: id === "country-types-busan" ? "basic" : "detail", name }));
  return [];
}

export function useChatDataset(id, payload) {
  const { pathname } = useLocation();
  const serialized = JSON.stringify(payload);
  useEffect(() => {
    const key = `${pathname}:${id}`;
    datasets.set(key, { id, page: pathname, graphs: graphCoverage(id), ...JSON.parse(serialized) });
    window.dispatchEvent(new Event(CHAT_DATA_EVENT));
    return () => { datasets.delete(key); window.dispatchEvent(new Event(CHAT_DATA_EVENT)); };
  }, [id, pathname, serialized]);
}

export function getChatDatasets(page) {
  return [...datasets.values()].filter((dataset) => dataset.page === page);
}

export function countChatDatasets(context) {
  const counts = Object.fromEntries(["visits", "sales", "types"].map((category) => [category, { total: 0, basic: 0, detail: 0 }]));
  for (const dataset of context?.datasets ?? []) {
    if (dataset.status !== "ready" || !dataset.data) continue;
    for (const graph of dataset.graphs ?? graphCoverage(dataset.id)) {
      counts[graph.category].total += 1;
      counts[graph.category][graph.view] += 1;
    }
  }
  return counts;
}

// Share the month axis once instead of repeating dates and country names per row.
export function monthlyCountryData(rows = [], valueKey) {
  const months = [...new Set(rows.map((row) => row.base_ym))].sort();
  const series = new Map();
  for (const row of rows) {
    const key = row.country_cd ?? row.country_nm;
    if (!series.has(key)) series.set(key, { country: row.country_nm, country_cd: row.country_cd, values: {} });
    series.get(key).values[row.base_ym] = Number(row[valueKey]);
  }
  return { months, series: [...series.values()].map((item) => ({ ...item, values: months.map((month) => item.values[month] ?? null) })) };
}

export function distributionSummary(rows = []) {
  return rows.map(({ country_nm, values, month_count }) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return { country_nm, month_count };
    const quantile = (p) => { const i = (sorted.length - 1) * p; return sorted[Math.floor(i)] + (sorted[Math.ceil(i)] - sorted[Math.floor(i)]) * (i - Math.floor(i)); };
    const q1 = quantile(.25), q3 = quantile(.75), iqr = q3 - q1;
    const inside = sorted.filter((value) => value >= q1 - 1.5 * iqr && value <= q3 + 1.5 * iqr);
    return { country_nm, month_count, unit: "원/방문객", median: quantile(.5), q1, q3, lower_whisker: inside[0], upper_whisker: inside.at(-1), outlier_lower: Math.max(0, q1 - 1.5 * iqr), outlier_upper: q3 + 1.5 * iqr };
  });
}
