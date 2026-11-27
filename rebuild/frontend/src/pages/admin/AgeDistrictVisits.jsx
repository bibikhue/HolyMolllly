import { useEffect, useState } from "react";
import { getAgeDistrictVisits } from "../../apis/admin";
import StackedBarChart from "../../components/StackedBarChart";

const COLORS = [
  "#d95f0e", "#f16913", "#fd8d3c", "#fdae6b", "#238b45", "#41ab5d", "#74c476", "#a1d99b",
  "#2171b5", "#4292c6", "#6baed6", "#9ecae1", "#6a51a3", "#807dba", "#9e9ac8", "#bcbddc",
];

export default function AgeDistrictVisits({ start, end, height }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getAgeDistrictVisits({ start_ym: start, end_ym: end }, controller.signal)
      .then(({ data }) => {
        if (!Array.isArray(data.age_groups)) throw new Error("연령별 방문 통계 응답을 확인할 수 없습니다.");
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.response?.data?.message || "연령대별 방문 통계를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [start, end]);

  const ages = (result?.age_groups ?? []).filter((age) => Number(age.total_visitor_cnt) > 0);
  const districts = new Map();
  for (const age of ages) {
    for (const group of age.groups) {
      for (const district of group.districts) {
        const item = districts.get(district.sgg_cd) ?? { code: district.sgg_cd, name: district.sgg_nm, total: 0, ages: new Map() };
        item.total += Number(district.visitor_cnt);
        item.ages.set(age.age_group, district);
        districts.set(item.code, item);
      }
    }
  }
  const series = [...districts.values()].sort((a, b) => b.total - a.total || a.code.localeCompare(b.code)).map((item, index) => ({
    name: item.name, color: COLORS[index % COLORS.length],
    values: ages.map((age) => Number(item.ages.get(age.age_group)?.share_pct ?? 0)),
    counts: ages.map((age) => Number(item.ages.get(age.age_group)?.visitor_cnt ?? 0)),
  }));

  return (
    <div className="admin-visits__card admin-visits__monthly admin-visits__age">
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">연령대별 방문 통계를 불러오는 중입니다.</p> : (
        <>
          <StackedBarChart title="연령대별 외지인 방문 비율" labels={ages.map((age) => age.age_group)} series={series} height={height} />
        </>
      )}
    </div>
  );
}
