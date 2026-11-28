import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getVisitsByCountry, getSalesByCountry, getMonthlyVisitsByCountry, getMonthlySalesByCountry } from "../../apis/admin";
import { useAnalysisFilter } from "../../components/analysisFilters";
import { monthlyCountryData, useChatDataset } from "../../components/chatDatasets";
import MonthPicker from "../../components/MonthPicker";
import LoadingSpinner from "../../components/LoadingSpinner";
import LineChart from "../../components/LineChart";
import { PATHS } from "../../constants/paths";
import "./Report.css";

const number = (value, digits = 0) => Number(value).toLocaleString("ko-KR", { maximumFractionDigits: digits });
const total = (rows, key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
const share = (value, sum) => sum ? `${number(value / sum * 100, 1)}%` : "—";

function Ranking({ title, rows, valueKey, sum, scale, unit }) {
  const { t } = useTranslation();
  const sorted = [...rows].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey])).slice(0, 10);
  return <section className="analysis-report__ranking">
    <h2>{t(title)}</h2>
    <div className="analysis-report__table-scroll"><table>
      <thead><tr><th scope="col">{t("순위")}</th><th scope="col">{t("국가")}</th><th scope="col">{unit === "명" ? t("방문객 수") : t("소비금액")}</th><th scope="col">{t("비중")}</th></tr></thead>
      <tbody>{sorted.map((row, index) => <tr key={row.country_cd ?? row.country_nm}>
        <td>{index + 1}</td><th scope="row">{t(row.country_nm)}</th><td>{number(Number(row[valueKey]) / scale, unit === "명" ? 0 : 2)} {t(unit)}</td><td>{share(Number(row[valueKey]), sum)}</td>
      </tr>)}</tbody>
    </table></div>
    {!sorted.length && <p>{t("조회 기간에 데이터가 없습니다.")}</p>}
  </section>;
}

function monthlySeries(rows, key, top) {
  const compact = monthlyCountryData(rows, key);
  return compact.series.filter((item) => top.some((country) => country.name === item.country || country.code === item.country_cd)).map((item) => ({ name: item.country, x: compact.months, y: item.values }));
}

export default function AdminReport() {
  const { t } = useTranslation();
  const [period, setPeriod] = useAnalysisFilter("period");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify(period);
  const ready = result?.key === key;
  const year = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric" }).format(new Date()));
  const years = Array.from({ length: year - 2018 + 1 }, (_, index) => index + 2018);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getVisitsByCountry(period, controller.signal), getSalesByCountry(period, controller.signal), getMonthlyVisitsByCountry(period, controller.signal), getMonthlySalesByCountry(period, controller.signal)])
      .then(([visits, sales, visitTrend, salesTrend]) => {
        if (controller.signal.aborted) return;
        const bodies = [visits, sales, visitTrend, salesTrend].map((response) => response.data);
        if (bodies.some((body) => !Array.isArray(body.data))) throw new Error("리포트 데이터를 확인할 수 없습니다.");
        setResult({ key, visits: visits.data, sales: sales.data, visitTrend: visitTrend.data.data, salesTrend: salesTrend.data.data });
        setError("");
      }).catch((failure) => {
        if (!controller.signal.aborted) setError(failure.response?.data?.message || "리포트를 불러오지 못했습니다. 다시 시도해 주세요.");
      });
    return () => controller.abort();
  }, [period, key, retry]);

  const visitRows = ready ? result.visits.data : [];
  const salesRows = ready ? result.sales.data : [];
  const visits = total(visitRows, "tourist_cnt");
  const sales = total(salesRows, "sales_amt");
  const leaders = (rows, valueKey) => [...rows].filter((row) => row.country_nm !== "기타").sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));
  const visitLeaders = leaders(visitRows, "tourist_cnt"), salesLeaders = leaders(salesRows, "sales_amt");
  const sameCoverage = ready && result.visits.start_ym === result.sales.start_ym && result.visits.end_ym === result.sales.end_ym;
  const status = ready ? "ready" : error ? "error" : "loading";
  useChatDataset("report-visits", { period, status, graphs: [{ category: "visits", view: "basic", name: "리포트 월별 방문 추이" }], data: ready ? { countries: visitRows, monthly: monthlyCountryData(result.visitTrend, "tourist_cnt"), unit: "명" } : null });
  useChatDataset("report-sales", { period, status, graphs: [{ category: "sales", view: "basic", name: "리포트 월별 소비 추이" }], data: ready ? { countries: salesRows, monthly: monthlyCountryData(result.salesTrend, "sales_amt"), unit: "원" } : null });

  const search = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const start = `${data.get("start_year")}-${data.get("start_month")}`, end = `${data.get("end_year")}-${data.get("end_month")}`;
    if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) { setFormError("시작월과 종료월을 선택해 주세요."); return; }
    if (start > end) { setFormError("시작월은 종료월보다 늦을 수 없습니다."); return; }
    const months = (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(end.slice(5)) - Number(start.slice(5)) + 1;
    if (months < 3) { setFormError("조회 기간은 최소 3개월로 선택해 주세요."); return; }
    setFormError(""); setError(""); setResult(null); setPeriod({ start_ym: start, end_ym: end }); setRetry((value) => value + 1);
  };

  return <article className="analysis-report" data-chat-context={JSON.stringify({ period, scope: "부산 전체", page: "분석 리포트" })}>
    <header className="analysis-report__header"><div><span>{t("관광 정책 지원")}</span><h1>{t("분석 리포트")}</h1><p className="analysis-report__print-period">{period.start_ym} ~ {period.end_ym} · 부산 전체</p></div><button type="button" onClick={() => window.print()} disabled={!ready}>{t("인쇄 / PDF 저장")}</button></header>
    <form className="analysis-report__filters" onSubmit={search} aria-label={t("리포트 조회 기간")}>
      <MonthPicker key={`start-${key}`} name="start" label="시작월" years={years} value={period.start_ym} />
      <span aria-hidden="true">~</span>
      <MonthPicker key={`end-${key}`} name="end" label="종료월" years={years} value={period.end_ym} />
      <button type="submit">{t("조회")}</button>
      {formError && <p role="alert">{t(formError)}</p>}
    </form>
    {error ? <div className="analysis-report__state" role="alert"><p>{t(error)}</p><button type="button" onClick={() => { setError(""); setRetry((value) => value + 1); }}>{t("다시 시도")}</button></div> : !ready ? <div className="analysis-report__state"><LoadingSpinner /></div> : <>
      <section className="analysis-report__totals" aria-label={t("주요 지표")}>
        <div><span>{t("누적 외국인 방문객 수")}</span><strong>{number(visits)}<small>{t("명")}</small></strong></div>
        <div><span>{t("누적 관광소비액")}</span><strong>{number(sales / 100000000, 1)}<small>{t("억원")}</small></strong></div>
        <div><span>{t("방문당 관광소비액")}</span><strong>{sameCoverage && visits ? number(sales / visits) : "—"}<small>{sameCoverage && visits ? t("원") : t("비교 자료 없음")}</small></strong></div>
      </section>
      {(visitLeaders.length > 0 || salesLeaders.length > 0) && <section className="analysis-report__summary" aria-label={t("핵심 요약")}>
        <h2>{t("핵심 요약")}</h2>
        {visitLeaders[0] && <p>{t("visitLeaderSummary", { country: t(visitLeaders[0].country_nm), share: share(Number(visitLeaders[0].tourist_cnt), visits) })}</p>}
        {salesLeaders[0] && <p>{t("salesLeaderSummary", { country: t(salesLeaders[0].country_nm), share: share(Number(salesLeaders[0].sales_amt), sales) })}</p>}
      </section>}
      <div className="analysis-report__columns">
        <Ranking title={t("국가별 방문 순위")} rows={visitRows} valueKey="tourist_cnt" sum={visits} scale={1} unit="명" />
        <Ranking title={t("국가별 소비 순위")} rows={salesRows} valueKey="sales_amt" sum={sales} scale={100000000} unit="억원" />
      </div>
      <div className="analysis-report__columns analysis-report__trends">
        <section><h2>월별 방문 추이 <small>상위 5개 국가</small></h2><LineChart title="월별 방문 추이" showTitle={false} responsive height={280} series={monthlySeries(result.visitTrend, "tourist_cnt", visitLeaders.slice(0, 5).map((row) => ({ code: row.country_cd, name: row.country_nm })))} scale={10000} yTitle="방문객 수 (만 명)" unit="명" xAxis={{ tickangle: 0, nticks: 5 }} /></section>
        <section><h2>월별 소비 추이 <small>상위 5개 국가</small></h2><LineChart title="월별 소비 추이" showTitle={false} responsive height={280} series={monthlySeries(result.salesTrend, "sales_amt", salesLeaders.slice(0, 5).map((row) => ({ code: row.country_cd, name: row.country_nm })))} scale={100000000} yTitle="소비금액 (억원)" unit="원" xAxis={{ tickangle: 0, nticks: 5 }} /></section>
      </div>
      <footer className="analysis-report__footer"><p>{t("부산 전체 · 방문은 구·군 합산으로 중복될 수 있습니다. 관광소비액은 일반 관광소비 기준입니다.")}</p><Link to={PATHS.ADMIN_COUNTRIES}>{t("방문 및 소비 상세 보기 →")}</Link></footer>
    </>}
  </article>;
}
