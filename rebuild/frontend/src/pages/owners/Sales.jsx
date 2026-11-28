import { useTranslation } from "react-i18next";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useEffect, useState } from "react";
import { getSalesOverview, getSalesPatterns, getPerVisitorCountries } from "../../apis/owners";
import { getMonthlySalesPerVisitor } from "../../apis/admin";
import DonutChart from "../../components/DonutChart";
import LineChart from "../../components/LineChart";
import SalesDistrictMap from "./SalesDistrictMap";
import SalesCountryChart from "./SalesCountryChart";
import { CHART_COLORS, SALES_COUNTRIES, formatEpayEok as formatEok } from "../../constants/charts";
import "./Sales.css";
import { useAnalysisFilter } from "../../components/analysisFilters";
import { monthlyCountryData, useChatDataset } from "../../components/chatDatasets";

const INDUSTRY_COLORS = { 쇼핑업: "#76c893", 식음료업: "#f4a261", 숙박업: "#9b8afb", 여가서비스업: "#eac44b", 의료웰니스업: "#589ed6", 운송업: "#65b8b0", 여행업: "#b8c3ce" };
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function PerVisitorTrend({ district, countryCode, period }) {
  const [response, setResponse] = useState(null);
  const [failure, setFailure] = useState(null);
  const requestKey = `${district}:${countryCode}:${period.start_ym}:${period.end_ym}`;
  useChatDataset("owners-per-visitor", { period, district, country: countryCode, unit: "원/방문객", status: failure?.key === requestKey ? "error" : response?.requestKey === requestKey ? "ready" : "loading", data: response?.requestKey === requestKey ? response : null });
  useEffect(() => {
    const controller = new AbortController();
    getMonthlySalesPerVisitor({ ...period, country_cd: countryCode, sgg_cd: district }, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setResponse({ ...data, requestKey }); })
      .catch((error) => { if (!controller.signal.aborted) setFailure({ key: requestKey, message: error.response?.data?.message || "1인당 소비 추이를 불러오지 못했습니다." }); });
    return () => controller.abort();
  }, [district, countryCode, period, requestKey]);
  if (failure?.key === requestKey) return <p role="alert">{failure.message}</p>;
  if (response?.requestKey !== requestKey) return <LoadingSpinner label="1인당 소비 추이를 불러오는 중입니다." />;
  const series = response.series.map((row, index) => ({ name: `${row.year}년`, x: MONTHS, y: row.sales_per_visitor, color: CHART_COLORS[index % CHART_COLORS.length] }));
  const maximum = Math.max(0, ...series.flatMap((row) => row.y.filter(Number.isFinite)));
  return <LineChart title={`${response.country_nm} 연도별 월간 1인당 관광소비 추이`} series={series} responsive height={280} unit="원" yTitle="1인당 관광소비액 (원)" legendTitle="연도"
    formatValue={(value) => Math.round(value).toLocaleString("ko-KR")}
    xAxis={{ type: "linear", title: { text: "월" }, tickangle: 0, tickformat: undefined, tickvals: MONTHS, ticktext: MONTHS.map((month) => `${month}월`), range: [.7, 12.3] }}
    yAxis={{ range: [0, maximum ? maximum * 1.08 : 1], autorange: false, tickformat: ",.0f", ticksuffix: "원" }} />;
}

export default function OwnersSales({ period, view }) {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [patternsError, setPatternsError] = useState(null);
  const [district, setDistrict] = useAnalysisFilter("district");
  const [industry, setIndustry] = useState("");
  const [month, setMonth] = useAnalysisFilter("month");
  const [countryCode, setCountryCode] = useAnalysisFilter("country");
  const [availableCountries, setAvailableCountries] = useState(null);
  const [countriesError, setCountriesError] = useState(null);
  const periodKey = `${period.start_ym}:${period.end_ym}`;
  const countriesKey = `${periodKey}:${district}`;
  const detailKey = `${periodKey}:${district}:${industry}`;
  useEffect(() => {
    const controller = new AbortController();
    getSalesOverview(period, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setOverview({ ...data, periodKey }); })
      .catch((error) => { if (!controller.signal.aborted) setOverviewError({ key: periodKey, message: error.response?.data?.message || "소비 분포를 불러오지 못했습니다." }); });
    return () => controller.abort();
  }, [period, periodKey]);
  useEffect(() => {
    const controller = new AbortController();
    getSalesPatterns({ ...period, sgg_cd: district, ...(industry && { industry_nm: industry }) }, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setPatterns({ ...data, detailKey }); })
      .catch((error) => { if (!controller.signal.aborted) setPatternsError({ key: detailKey, message: error.response?.data?.message || "국적별 소비를 불러오지 못했습니다." }); });
    return () => controller.abort();
  }, [period, district, industry, detailKey]);
  useEffect(() => {
    const controller = new AbortController();
    getPerVisitorCountries({ ...period, sgg_cd: district }, controller.signal)
      .then(({ data }) => {
        if (!controller.signal.aborted) setAvailableCountries({ key: countriesKey, data: data.data.filter((row) => row.country_cd && row.country_nm !== "기타" && Number(row.sales_amt) > 0).sort((a, b) => a.country_nm.localeCompare(b.country_nm, "ko")) });
      })
      .catch((error) => { if (!controller.signal.aborted) setCountriesError({ key: countriesKey, message: error.response?.data?.message || "지원 국가를 불러오지 못했습니다." }); });
    return () => controller.abort();
  }, [period, district, countriesKey]);
  const countryOptions = availableCountries?.key === countriesKey ? availableCountries.data : [];
  const selectedCountryCode = countryOptions.find((row) => String(row.country_cd) === countryCode)?.country_cd ?? "";

  const rows = overview?.periodKey === periodKey ? overview.data : [];
  const months = [...new Set(rows.map((row) => row.base_ym))].sort();
  const selectedMonth = months.includes(month) ? month : months.at(-1) ?? "";
  const industries = [...new Set(rows.map((row) => row.industry_nm))];
  const districts = [...new Map(rows.map((row) => [row.sgg_cd, { code: row.sgg_cd, name: row.sgg_nm }])).values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const districtName = districts.find((row) => row.code === district)?.name ?? "선택 구·군";
  const mapValues = {};
  for (const row of rows) if (row.base_ym === selectedMonth && (!industry || industry === row.industry_nm)) mapValues[row.sgg_cd] = (mapValues[row.sgg_cd] ?? 0) + Number(row.sales_amt) / 100000;
  const industryTotals = new Map();
  for (const row of rows) if (row.base_ym === selectedMonth && row.sgg_cd === district) industryTotals.set(row.industry_nm, (industryTotals.get(row.industry_nm) ?? 0) + Number(row.sales_amt));
  const donutData = [...industryTotals].map(([label, value]) => ({ label, value, color: INDUSTRY_COLORS[label] })).sort((a, b) => b.value - a.value);
  const donutTotal = donutData.reduce((sum, row) => sum + row.value, 0);
  const detail = patterns?.detailKey === detailKey ? patterns : null;
  const periodTotals = new Map();
  for (const row of rows) {
    const key = `${row.sgg_cd}:${row.industry_nm}`;
    const total = periodTotals.get(key) ?? { sgg_cd: row.sgg_cd, sgg_nm: row.sgg_nm, industry_nm: row.industry_nm, sales_amt: 0 };
    total.sales_amt += Number(row.sales_amt);
    periodTotals.set(key, total);
  }
  useChatDataset("owners-sales", { period, district, industry: industry || "전체 업종", month: selectedMonth, unit: "천원", status: overview?.periodKey !== periodKey || !detail ? "loading" : "ready", data: { overview: overview?.periodKey === periodKey ? { period_totals: [...periodTotals.values()], selected_month: rows.filter((row) => row.base_ym === selectedMonth) } : null, country_spending: detail ? { countries: detail.countries, monthly: monthlyCountryData(detail.monthly, "sales_amt") } : null } });
  const seriesMonths = [];
  for (let ym = period.start_ym; ym <= period.end_ym;) {
    seriesMonths.push(ym);
    const [year, number] = ym.split("-").map(Number);
    ym = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
  }
  const monthCounts = new Map();
  for (const row of detail?.monthly ?? []) {
    const name = SALES_COUNTRIES.slice(0, 4).some((country) => country.name === row.country_nm) ? row.country_nm : "기타";
    const key = `${name}:${row.base_ym}`;
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + Number(row.sales_amt));
  }
  const monthlySeries = SALES_COUNTRIES.map((country) => ({ ...country, x: seriesMonths.map((ym) => `${ym}-01`), y: seriesMonths.map((ym) => monthCounts.get(`${country.name}:${ym}`) ?? null) }));
  const monthlyMaximum = Math.max(0, ...monthlySeries.flatMap((row) => row.y.filter(Number.isFinite))) / 100000;
  const districtSelect = <label>{t("구·군")}<select aria-label="소비 분석 구·군" value={district} onChange={(event) => setDistrict(event.target.value)}>{districts.length ? districts.map((row) => <option value={t(row.code)} key={t(row.code)}>{t(row.name)}</option>) : <option value="26350">{t("해운대구")}</option>}</select></label>;
  const industrySelect = <label>{t("업종")}<select aria-label="소비 분석 업종" value={industry} onChange={(event) => setIndustry(event.target.value)}><option value="">{t("전체 업종")}</option>{industries.map((name) => <option value={t(name)} key={t(name)}>{t(name)}</option>)}</select></label>;
  const monthSelect = <label>{t("월")}<select aria-label="소비 지도 월" value={selectedMonth} onChange={(event) => setMonth(event.target.value)} disabled={!months.length}>{months.map((ym) => <option value={t(ym)} key={t(ym)}>{ym.replace("-", "년 ")}{t("월")}</option>)}</select></label>;

  return <div className="owners-sales" data-chat-context={JSON.stringify({ district: districtName, industry: industry || "전체 업종", month: selectedMonth })}>
    {overviewError?.key === periodKey && <p role="alert">{overviewError.message}</p>}
    {overview?.periodKey !== periodKey && overviewError?.key !== periodKey && <LoadingSpinner label="소비 데이터를 불러오는 중입니다." />}
    <div hidden={view !== "basic"}>
      <div className="owners-sales__filters">{monthSelect}{industrySelect}</div>
      {overview?.periodKey === periodKey && !rows.length && <p>선택한 기간에 간편결제 소비 데이터가 없습니다.</p>}
      <section className="owners-sales__chart"><h2>외국인 간편결제 소비 규모 · 부산 16개 구·군</h2>
        <SalesDistrictMap values={mapValues} selected={district} onSelect={setDistrict} />
      </section>

      <section className="owners-sales__chart owners-sales__divider"><div className="owners-sales__filters">{districtSelect}<label>{t("국가")}<select aria-label="1인당 소비 추이 국가" value={countryCode} disabled={!countryOptions.length} onChange={(event) => setCountryCode(event.target.value)}>{!selectedCountryCode && <option value={t(countryCode)} disabled>선택 국가 데이터 없음</option>}{countryOptions.map((country) => <option value={t(country.country_cd)} key={t(country.country_cd)}>{t(country.country_nm)}</option>)}</select></label></div>
        {countriesError?.key === countriesKey ? <p role="alert">{countriesError.message}</p> : availableCountries?.key !== countriesKey ? <LoadingSpinner label="지원 국가를 불러오는 중입니다." /> : selectedCountryCode ? <PerVisitorTrend district={district} countryCode={selectedCountryCode} period={period} /> : <p>선택한 구·군과 기간에 1인당 소비를 계산할 수 있는 국가가 없습니다.</p>}
      </section>
      <div className="owners-sales__divider">
        {patternsError?.key === detailKey ? <p role="alert">{patternsError.message}</p> : !detail ? <LoadingSpinner label="국적별 소비를 불러오는 중입니다." /> : (
          <section className="owners-sales__chart"><LineChart title={`${districtName} 국적별 월간 간편결제 관광소비 추이`} series={monthlySeries} responsive height={280} scale={100000} unit="억원" formatValue={formatEok} yTitle="소비금액 (억원)" xAxis={{ tickangle: 0 }} yAxis={{ range: [0, monthlyMaximum ? monthlyMaximum * 1.1 : 1], autorange: false }} /></section>
        )}
      </div>
    </div>
    <div hidden={view !== "detail"}>
      <div className="owners-sales__filters">{districtSelect}{industrySelect}</div>
      {patternsError?.key === detailKey ? <p role="alert">{patternsError.message}</p> : !detail ? <LoadingSpinner label="국적별 소비를 불러오는 중입니다." /> : <>
        <SalesCountryChart countries={detail.countries} district={districtName} />
      </>}

      <section className="owners-sales__chart owners-sales__divider"><div className="owners-sales__filters">{monthSelect}{districtSelect}</div><h2>{districtName} 업종별 간편결제 관광소비</h2>
        <div className="owners-sales__composition"><DonutChart data={donutData} centerLabel="총 소비액" centerValue={<>{formatEok(donutTotal)}<small>억원</small></>} chartSize={280} hole={.55} legend="none" percentDigits={1} minLabelPercent={3} showDataTable={false} formatValue={formatEok} unit="억원" />
          <table><caption className="owners-sales__sr-only">{districtName} 업종별 소비금액과 비중</caption><thead><tr><th>업종</th><th>소비액(억원)</th><th>비중</th></tr></thead><tbody>{donutData.map((row) => <tr key={row.label}><th><i style={{ background: row.color }} />{row.label}</th><td title={`${(row.value * 1000).toLocaleString("ko-KR")}원`}>{row.value > 0 && row.value < 100 ? "0.001 미만" : (row.value / 100000).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</td><td>{(row.value / donutTotal * 100).toFixed(1)}%</td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  </div>;
}
