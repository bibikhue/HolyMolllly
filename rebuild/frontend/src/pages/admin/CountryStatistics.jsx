import LoadingSpinner from "../../components/LoadingSpinner";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DonutChart from "../../components/DonutChart";
import LineChart from "../../components/LineChart";
import BoxPlot from "../../components/BoxPlot";
import CountryMonthlySpend from "./CountryMonthlySpend";
import CountryDistrictVisits from "./CountryDistrictVisits";
import CountryIndustrySpend from "./CountryIndustrySpend";
import AgeDistrictVisits from "./AgeDistrictVisits";
import MonthPicker from "../../components/MonthPicker";
import CountryTypes from "./CountryTypes";
import { CHART_COLORS } from "../../constants/charts";
import { getMonthlyVisitsByCountry, getVisitsByCountry, getSalesByCountry, getMonthlySalesByCountry, getSalesPerVisitorDistribution } from "../../apis/admin";
import "./Visits.css";
import { useAnalysisFilter } from "../../components/analysisFilters";
import { distributionSummary, monthlyCountryData, useChatDataset } from "../../components/chatDatasets";

// Match src/visualization/02_국가별_누적_관광소비.py: 원 → 억원.
const formatEok = (value) => (value / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 0 });
const METRICS = {
  visits: { name: "방문", key: "tourist_cnt", unit: "명", center: "누적 외국인 방문객", legend: "국가별 누적 방문객 수", trend: "월별 방문객 수", scale: 10000, yTitle: "외국인 방문객 수 (만 명)", summary: getVisitsByCountry, monthly: getMonthlyVisitsByCountry },
  sales: { name: "소비", key: "sales_amt", unit: "억원", center: "누적 관광소비", legend: "국가별 누적 소비금액", trend: "월별 소비 금액", scale: 100000000, yTitle: "소비 금액 (억원)", formatValue: formatEok, summary: getSalesByCountry, monthly: getMonthlySalesByCountry },
};

function StatisticsPanel({ metric, period, active, view, onBoundsChange }) {
  const config = METRICS[metric];
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [countryCode, setCountryCode] = useAnalysisFilter("country");
  const periodKey = JSON.stringify(period);
  useChatDataset(`policy-${metric}`, { period, unit: metric === "sales" ? "원" : "명", status: result?.periodKey === periodKey ? "ready" : "loading", data: result?.periodKey === periodKey ? { countries: result.data, monthly: monthlyCountryData(result.monthly, config.key), per_visitor_distribution: distributionSummary(result.distribution) } : null });
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);
  const overviewHeight = Math.max(240, Math.min(300, Math.floor((viewportHeight - 240) * 0.56)));
  const monthlyRef = useRef(null);
  const [monthlyHeight, setMonthlyHeight] = useState(220);
  const detailHeight = Math.max(380, Math.min(560, viewportHeight - 250));

  useLayoutEffect(() => {
    if (!active || view !== "basic" || !result) return;
    const monthly = monthlyRef.current;
    const main = monthly.closest("main");
    const overview = monthly.previousElementSibling;
    const updateHeight = () => {
      const offset = monthly.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
      const style = getComputedStyle(monthly);
      const available = main.clientHeight - offset - parseFloat(style.paddingTop) - parseFloat(style.borderTopWidth);
      setMonthlyHeight(Math.max(220, Math.min(360, Math.floor(available))));
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(main);
    observer.observe(overview);
    updateHeight();
    return () => observer.disconnect();
  }, [active, view, result]);

  useEffect(() => {
    const controller = new AbortController();
    const summaryRequest = config.summary(period, controller.signal);
    Promise.all([
      summaryRequest,
      config.monthly(period, controller.signal),
      getSalesPerVisitorDistribution(period, controller.signal),
      Object.keys(period).length ? config.summary({}, controller.signal) : summaryRequest,
    ])
      .then(([summary, monthly, distribution, fullPeriod]) => {
        if (!Array.isArray(summary.data.data) || !Array.isArray(monthly.data.data)) {
          throw new Error("방문 통계 응답을 확인할 수 없습니다.");
        }
        if (!controller.signal.aborted) {
          setResult({ ...summary.data, periodKey, monthly: monthly.data.data, distribution: distribution?.data.data ?? [] });
          onBoundsChange((previous) => ({ ...previous, [metric]: { start: fullPeriod.data.start_ym, end: fullPeriod.data.end_ym } }));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(error.response?.data?.message || `국가별 ${config.name} 통계를 불러오지 못했습니다.`);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [period, periodKey, config, metric, onBoundsChange]);

  const countries = (result?.data ?? [])
    .map((row) => ({ label: row.country_nm, value: Number(row[config.key]) }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value);
  const countryOptions = (result?.data ?? []).filter((item) => item.country_cd != null && item.country_nm !== "기타");
  const selectedCountry = countryOptions.find((item) => String(item.country_cd) === countryCode);
  const ranked = countries.filter((item) => item.label !== "기타");
  const chartData = ranked.slice(0, 10).map((item, index) => ({ ...item, color: CHART_COLORS[index] }));
  const other = countries.filter((item) => item.label === "기타")
    .concat(ranked.slice(10)).reduce((sum, item) => sum + item.value, 0);
  if (other > 0) chartData.push({ label: "기타", value: other, color: "#d9d9d9" });

  const months = [];
  if (result?.start_ym && result?.end_ym) {
    for (let month = result.start_ym; month <= result.end_ym;) {
      months.push(month);
      const [year, number] = month.split("-").map(Number);
      month = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
    }
  }
  const monthlyCounts = new Map((result?.monthly ?? []).map((row) => [
    `${row.country_nm}:${row.base_ym}`, Number(row[config.key]),
  ]));
  const monthlySeries = chartData.filter((item) => item.label !== "기타").map((item) => ({
    name: item.label, color: item.color, x: months.map((month) => `${month}-01`),
    y: months.map((month) => {
      const value = monthlyCounts.get(`${item.label}:${month}`);
      return Number.isFinite(value) ? value : null;
    }),
  }));

  return (
    <div className="country-statistics-panel" hidden={!active}>
      <div hidden={view !== "basic"}>
      <div className="admin-visits__overview">
      <div className="admin-visits__card admin-visits__summary" aria-busy={isLoading}>
        {isLoading && <LoadingSpinner label={`${config.name} 통계를 불러오는 중입니다.`} />}
        {error && <p role="alert">{error}</p>}
        {result && (
          <>
            <DonutChart
              data={chartData}
              centerLabel={config.center}
              unit={config.unit}
              formatValue={config.formatValue}
              legendTitle={config.legend}
              chartSize={overviewHeight}
              hole={0.5}
              centerValue={<>{(config.formatValue ?? ((value) => value.toLocaleString("ko-KR")))(countries.reduce((sum, item) => sum + item.value, 0))}<small>{config.unit}</small></>}
              legendWidth={180}
              showDataTable={false}
            />
          </>
        )}
      </div>
      {result && (
        <div className="admin-visits__card admin-visits__overview-trend">
          <BoxPlot title="1인당 관광 소비액 분포(상위 12개국)" showTitle={false} data={result.distribution} responsive height={overviewHeight + 48} />
        </div>
      )}
      </div>
      {result && (
        <div ref={monthlyRef} className="admin-visits__card admin-visits__monthly admin-visits__overview-monthly">
          <LineChart title={`${config.trend} (상위 10개 국가)`} showTitle={false} series={monthlySeries} scale={config.scale} yTitle={config.yTitle} unit={config.unit} formatValue={config.formatValue} responsive height={monthlyHeight} xAxis={{ tickangle: 0, title: { text: metric === "sales" ? "월별 소비금액(상위 10개 국가)" : "월별 방문객 수(상위 10개 국가)" } }} yAxis={{ range: [0, metric === "sales" ? 500 : 200], dtick: metric === "sales" ? 100 : 50, fixedrange: true }} />
        </div>
      )}
      </div>
      <div className={`country-statistics-details country-statistics-details--${metric}`} hidden={view !== "detail"}>
      {result && metric === "sales" && (
        <CountryMonthlySpend countries={result.data} country={selectedCountry} countryCode={countryCode} onCountryChange={setCountryCode} start={result.start_ym} end={result.end_ym} height={Math.max(220, Math.min(280, viewportHeight - 620))} />
      )}
      {result && metric === "visits" && (
        <CountryDistrictVisits countries={result.data} start={result.start_ym} end={result.end_ym} height={detailHeight} />
      )}
      {result && metric === "visits" && (
        <AgeDistrictVisits key={`${result.start_ym}:${result.end_ym}`} start={result.start_ym} end={result.end_ym} height={detailHeight} />
      )}
      {result && metric === "sales" && (
        <CountryIndustrySpend country={selectedCountry} start={result.start_ym} end={result.end_ym} />
      )}
      </div>
    </div>
  );
}

export default function CountryStatistics() {
  const [, setSearchParams] = useSearchParams();
  const [metric, setMetric] = useState(() => new URLSearchParams(window.location.search).get("metric") === "types" ? "types" : "visits");
  const [typesOpened, setTypesOpened] = useState(metric === "types");
  const [view, setView] = useState("basic");
  const [period, setPeriod] = useAnalysisFilter("period");
  const [periodError, setPeriodError] = useState("");
  const [bounds, setBounds] = useState({});
  const [requestId, setRequestId] = useState(0);

  const handleSearch = (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const startYear = values.get("start_year");
    const startMonth = values.get("start_month");
    const endYear = values.get("end_year");
    const endMonth = values.get("end_month");
    if (Boolean(startYear) !== Boolean(startMonth) || Boolean(endYear) !== Boolean(endMonth)) {
      setPeriodError("연도와 월을 함께 선택해 주세요.");
      return;
    }
    const start = startYear ? `${startYear}-${startMonth}` : "";
    const end = endYear ? `${endYear}-${endMonth}` : "";
    if (start && end && start > end) {
      setPeriodError("시작 연월은 끝 연월보다 늦을 수 없습니다.");
      return;
    }
    if (start && end) {
      const monthCount = (Number(endYear) - Number(startYear)) * 12 + Number(endMonth) - Number(startMonth) + 1;
      if (monthCount < 3) {
        setPeriodError("조회 기간은 최소 3개월로 선택해 주세요.");
        return;
      }
    }
    setPeriodError("");
    const nextPeriod = { ...(start && { start_ym: start }), ...(end && { end_ym: end }) };
    setPeriod(nextPeriod);
    setRequestId((value) => value + 1);
    setSearchParams(nextPeriod, { replace: true });
  };

  const availableYears = Object.values(bounds).flatMap((bound) =>
    [bound.start, bound.end].filter(Boolean).map((month) => Number(month.slice(0, 4))));
  const firstYear = Math.min(...availableYears);
  const lastYear = Math.max(...availableYears);
  const years = availableYears.length ? Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index) : [];

  return (
    <div className="country-statistics-layout" data-chat-context={JSON.stringify({ period, metric, view })}>
      <aside className="country-statistics-sidebar" aria-label="통계 선택 및 공통 조회 조건">
        <nav className="country-statistics-tabs" aria-label="국가별 통계">
          <button type="button" aria-pressed={metric === "visits"} onClick={() => setMetric("visits")}>방문</button>
          <button type="button" aria-pressed={metric === "sales"} onClick={() => setMetric("sales")}>소비</button>
          <button type="button" aria-pressed={metric === "types"} onClick={() => { setTypesOpened(true); setMetric("types"); }}>국가별 특성 유형화</button>
        </nav>
        <form className="admin-visits__filters" onSubmit={handleSearch} aria-labelledby="country-period-title">
          <h2 id="country-period-title">공통 조회 기간</h2>
          <MonthPicker key={`start:${period.start_ym}:${years.join()}`} name="start" label="시작월" years={years} value={period.start_ym} />
          <MonthPicker key={`end:${period.end_ym}:${years.join()}`} name="end" label="종료월" years={years} value={period.end_ym} />
          <button type="submit">조회</button>
          {periodError && <p role="alert">{periodError}</p>}
        </form>
      </aside>
      <div className="admin-visits">
        <nav className="country-statistics-view-tabs" aria-label="분석 상세 수준">
          <button type="button" aria-pressed={view === "basic"} onClick={() => setView("basic")}>기본</button>
          <button type="button" aria-pressed={view === "detail"} onClick={() => setView("detail")}>상세</button>
        </nav>
        {Object.keys(METRICS).map((item) => (
          <StatisticsPanel key={`${item}:${requestId}`} metric={item} period={period} active={metric === item} view={view} onBoundsChange={setBounds} />
        ))}
        <div hidden={metric !== "types"}>{typesOpened && <CountryTypes period={period} view={view} />}</div>
      </div>
    </div>
  );
}
