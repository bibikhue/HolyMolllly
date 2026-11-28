import LoadingSpinner from "../../components/LoadingSpinner";
import { useEffect, useState } from "react";
import { getCountryDistrictVisits } from "../../apis/admin";
import GroupedBarChart from "../../components/GroupedBarChart";
import { AREA_COLORS } from "../../constants/charts";
import { useAnalysisFilter } from "../../components/analysisFilters";
import { useChatDataset } from "../../components/chatDatasets";

function DistrictChart({ country, start, end, height }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const code = country.country_cd;
  const requestKey = `${code}:${start}:${end}`;
  useChatDataset("policy-district-visits", { period: { start_ym: start, end_ym: end }, country: code, unit: "명", status: error ? "error" : result?.requestKey === requestKey ? "ready" : "loading", data: result?.requestKey === requestKey ? result : null });
  useEffect(() => {
    const controller = new AbortController();
    getCountryDistrictVisits({ country_cd: code, start_ym: start, end_ym: end }, controller.signal)
      .then(({ data }) => {
        if (!Array.isArray(data.groups)) throw new Error("구군 방문 통계 응답을 확인할 수 없습니다.");
        if (!controller.signal.aborted) setResult({ ...data, requestKey });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.response?.data?.message || "구군별 방문 통계를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [code, start, end, requestKey]);

  if (error) return <p role="alert">{error}</p>;
  if (!result) return <LoadingSpinner label="구군별 방문 통계를 불러오는 중입니다." />;

  const groups = result.groups.map((group) => ({
    name: group.name, color: AREA_COLORS[group.name],
    data: group.districts.map((district) => ({
      label: district.sgg_nm, value: Number(district.share_pct), count: Number(district.tourist_cnt),
    })),
  }));
  return <GroupedBarChart title={`${country.country_nm} 부산 구·군 방문 비율`} groups={groups} height={height} />;
}

export default function CountryDistrictVisits({ countries, start, end, height }) {
  const [selectedCode, setSelectedCode] = useAnalysisFilter("country");
  const options = countries.filter((item) => item.country_cd != null && item.country_nm !== "기타");
  const selected = options.find((item) => String(item.country_cd) === selectedCode);
  return (
    <div className="admin-visits__card admin-visits__monthly">
          <label className="admin-visits__country-select">
            국가
            <select value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)}>
              {!selected && <option value={selectedCode} disabled>선택 국가 데이터 없음</option>}
              {options.map((item) => <option key={item.country_cd} value={String(item.country_cd)}>{item.country_nm}</option>)}
            </select>
          </label>
      {selected ? <DistrictChart key={`${selected.country_cd}:${start}:${end}`} country={selected} start={start} end={end} height={height} /> : <p>선택 국가의 데이터가 없습니다.</p>}
    </div>
  );
}
