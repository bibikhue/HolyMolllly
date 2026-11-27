import { useEffect, useState } from "react";
import { getMonthlySalesPerVisitor } from "../../apis/admin";
import LineChart from "../../components/LineChart";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const YEAR_COLORS = ["#1d4f7a", "#59a14f", "#f46d43", "#9467bd", "#e6a329", "#28a6a1", "#b85978", "#667085"];
const formatWon = (value) => Math.round(value).toLocaleString("ko-KR");

function CountryYearChart({ country, start, end, height }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const code = country.country_cd;

  useEffect(() => {
    const controller = new AbortController();
    getMonthlySalesPerVisitor({ country_cd: code, start_ym: start, end_ym: end }, controller.signal)
      .then(({ data }) => {
        if (!Array.isArray(data.series)) throw new Error("월별 소비 통계 응답을 확인할 수 없습니다.");
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.response?.data?.message || "월별 1인당 소비 통계를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [code, start, end]);

  if (error) return <p role="alert">{error}</p>;
  if (!result) return <p role="status">월별 1인당 소비 통계를 불러오는 중입니다.</p>;

  const series = [...result.series].sort((a, b) => a.year - b.year).map((item, index) => ({
    name: `${item.year}년`, x: MONTHS,
    y: item.sales_per_visitor.map((value) => value === null ? null : Number(value)),
    color: YEAR_COLORS[index % YEAR_COLORS.length],
  }));
  const maximum = Math.max(0, ...series.flatMap((item) => item.y.filter((value) => Number.isFinite(value))));

  return (
    <LineChart
      title={`${country.country_nm} 연도별 월간 1인당 관광소비 추이`}
      series={series} responsive height={height} yTitle="1인당 관광소비액 (원)" unit="원"
      formatValue={formatWon} legendTitle="연도"
      xAxis={{ type: "linear", title: { text: "월" }, tickangle: 0, tickformat: undefined, tickvals: MONTHS, ticktext: MONTHS.map((month) => `${month}월`), range: [0.7, 12.3] }}
      yAxis={{ range: [0, maximum > 0 ? maximum * 1.08 : 1], autorange: false, tickformat: ",.0f", ticksuffix: "원" }}
    />
  );
}

export default function CountryMonthlySpend({ countries, country: selected, onCountryChange, start, end, height = 420 }) {
  const options = countries.filter((item) => item.country_cd != null && item.country_nm !== "기타");

  return (
    <div className="admin-visits__card admin-visits__monthly">
      {selected ? (
        <>
          <label className="admin-visits__country-select">
            국가
            <select value={String(selected.country_cd)} onChange={(event) => onCountryChange(event.target.value)}>
              {options.map((item) => <option key={item.country_cd} value={String(item.country_cd)}>{item.country_nm}</option>)}
            </select>
          </label>
          <CountryYearChart key={`${selected.country_cd}:${start}:${end}`} country={selected} start={start} end={end} height={height} />
        </>
      ) : <p>조회할 국가가 없습니다.</p>}
    </div>
  );
}
