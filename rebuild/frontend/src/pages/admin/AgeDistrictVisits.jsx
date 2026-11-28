import LoadingSpinner from "../../components/LoadingSpinner";
import { useEffect, useState } from "react";
import { getAgeDistrictVisits } from "../../apis/admin";
import StackedBarChart from "../../components/StackedBarChart";
import { AREA_COLORS, AREA_SHADES } from "../../constants/charts";
import { useChatDataset } from "../../components/chatDatasets";

export default function AgeDistrictVisits({ start, end, height }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const requestKey = `${start}:${end}`;
  useChatDataset("policy-age-district", { period: { start_ym: start, end_ym: end }, unit: "방문 건수", status: error ? "error" : result?.requestKey === requestKey ? "ready" : "loading", data: result?.requestKey === requestKey ? result : null });

  useEffect(() => {
    const controller = new AbortController();
    getAgeDistrictVisits({ start_ym: start, end_ym: end }, controller.signal)
      .then(({ data }) => {
        if (!Array.isArray(data.age_groups)) throw new Error("연령별 방문 통계 응답을 확인할 수 없습니다.");
        if (!controller.signal.aborted) setResult({ ...data, requestKey });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.response?.data?.message || "연령대별 방문 통계를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [start, end, requestKey]);

  const ages = (result?.age_groups ?? []).filter((age) => Number(age.total_visitor_cnt) > 0);
  const districts = new Map();
  for (const age of ages) {
    for (const group of age.groups) {
      for (const [index, district] of group.districts.entries()) {
        const item = districts.get(district.sgg_cd) ?? {
          code: district.sgg_cd, name: district.sgg_nm, area: group.name, order: index,
          color: AREA_SHADES[group.name]?.[index] ?? AREA_COLORS[group.name], ages: new Map(),
        };
        item.ages.set(age.age_group, district);
        districts.set(item.code, item);
      }
    }
  }
  const areaOrder = Object.keys(AREA_COLORS);
  const series = [...districts.values()].sort((a, b) => areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area) || a.order - b.order).map((item) => ({
    name: item.name, color: item.color,
    values: ages.map((age) => Number(item.ages.get(age.age_group)?.share_pct ?? 0)),
    counts: ages.map((age) => Number(item.ages.get(age.age_group)?.visitor_cnt ?? 0)),
  }));

  return (
    <div className="admin-visits__card admin-visits__monthly admin-visits__age">
      {error ? <p role="alert">{error}</p> : !result ? <LoadingSpinner label="연령대별 방문 통계를 불러오는 중입니다." /> : (
        <>
          <StackedBarChart title="연령대별 외지인 방문 비율" labels={ages.map((age) => age.age_group)} series={series} height={height} />
        </>
      )}
    </div>
  );
}
