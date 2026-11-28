import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useAnalysisFilter } from "../../components/analysisFilters";
import "./Forecast.css";

const COUNTRIES = [{ name:"일본", code:"392" },{ name:"대만", code:"158" },{ name:"중국", code:"156" },{ name:"미국", code:"840" },{ name:"종합", code:"all" }];
const CONDITIONS = ["축제·행사", "공연·전시", "체험 프로그램"];
function TrendIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 17l5-5 4 3 7-9M14 6h6v6" /></svg>;
}

export default function AdminForecast() {
  const { t } = useTranslation();
  const [month, setMonth] = useAnalysisFilter("month");
  const [country, setCountry] = useAnalysisFilter("country");
  const [horizon, setHorizon] = useState(1);
  const [conditions, setConditions] = useState([0,0,0]);
  const [combined, setCombined] = useState(false);
  const selected = combined ? COUNTRIES[4] : COUNTRIES.find(item => item.code === country) ?? COUNTRIES[0];
  const selectCountry = (item) => { setCombined(item.code === "all"); if (item.code !== "all") setCountry(item.code); };

  return <article className="forecast-page">
    <header className="forecast-page__heading"><div><span>{t("관광 정책 지원")}</span><h1>{t("관광객 수 예측 시뮬레이션")}</h1></div><span className="forecast-page__preview">{t("화면 미리보기")}</span></header>
    <div className="forecast-page__layout">
      <aside className="forecast-conditions" aria-label={t("예측 조건")}>
        <section className="forecast-conditions__scope">
          <h2>{t("예측 기준")}</h2>
          <label>{t("예측 모델")}<select value={selected.code} onChange={event => selectCountry(COUNTRIES.find(item => item.code === event.target.value))}>{COUNTRIES.map(item => <option key={item.code} value={item.code}>{item.code === "all" ? t("전체 국가 모델") : t("modelName", { name: t(item.name) })}</option>)}</select></label>
          <label>{t("기준월")}<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label>
          <fieldset><legend>{t("예측 시점")}</legend><div className="forecast-conditions__horizons">{[1,2,3].map(value => <button type="button" key={value} aria-pressed={horizon === value} onClick={() => setHorizon(value)}>{t("horizonMonths", { count: value })}</button>)}</div></fieldset>
        </section>
        <section className="forecast-conditions__adjust">
          <div className="forecast-conditions__title"><h2>{t("조절 조건")}</h2><button type="button" onClick={() => setConditions([0,0,0])}>{t("초기화")}</button></div>
          {CONDITIONS.map((name,index) => <div className="forecast-condition" key={name}>
            <label htmlFor={`forecast-condition-${index}`}>{t(name)}<output>+{conditions[index]}<small>{t("건")}</small></output></label>
            <input id={`forecast-condition-${index}`} type="range" min="0" max="10" step="1" value={conditions[index]} onChange={event => setConditions(previous => previous.map((value,i) => i === index ? Number(event.target.value) : value))} />
            <div className="forecast-condition__scale"><span>{t("현재 유지")}</span><span>+10 {t("건")}</span></div>
          </div>)}
        </section>
        <section className="forecast-conditions__fixed">
          <h2><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="4" y="8" width="12" height="9" rx="2" /><path d="M6.5 8V5a3.5 3.5 0 017 0v3M10 11v3" /></svg>{t("기준값 유지")}</h2>
          <p>{t("성별·연령 구성, 기존 방문 추세와 소비 특성은 기준 자료를 사용합니다.")}</p>
        </section>
        <button className="forecast-conditions__run" type="button" disabled><TrendIcon />{t("예측 준비 중")}</button>
      </aside>
      <div className="forecast-results">
        <div className="forecast-results__heading"><h2>{t("예측 결과")}</h2><span>{selected.code === "all" ? t("전체 국가 모델") : t("modelName", { name: t(selected.name) })} · {t("horizonMonths", { count: horizon })}</span></div>
        <div className="forecast-results__countries" aria-label={t("국가별 예측 결과")}>
          {COUNTRIES.map(item => <button type="button" key={item.code} aria-pressed={selected.code === item.code} onClick={() => selectCountry(item)}>
            <span>{t(item.name)}{item.code === "all" && <small>{t("전체 국가")}</small>}</span><strong>—<small>{t("명")}</small></strong><span className="forecast-results__change">{t("기준 대비 —")}</span>
          </button>)}
        </div>
        <section className="forecast-comparison" aria-labelledby="forecast-comparison-title">
          <div className="forecast-comparison__heading"><h2 id="forecast-comparison-title">{selected.name} 관광객 수 비교</h2><div className="forecast-comparison__legend"><span><i />{t("기준 예측")}</span><span><i />{t("조건 변경 후")}</span></div></div>
          <div className="forecast-comparison__plot">
            <span className="forecast-comparison__unit">관광객 수 (명)</span>
            <div className="forecast-comparison__grid" aria-hidden="true">{[0,1,2,3,4].map(value => <i key={value} />)}</div>
            <div className="forecast-comparison__empty"><span><TrendIcon /></span><strong>조건에 따른 관광객 수를 비교합니다</strong><p>예측 결과가 준비되면 그래프가 표시됩니다.</p></div>
            <div className="forecast-comparison__axis"><span>{t("기준월")}</span><span>1개월 뒤</span><span>2개월 뒤</span><span>3개월 뒤</span></div>
          </div>
        </section>
        <section className="forecast-details" aria-labelledby="forecast-details-title">
          <h2 id="forecast-details-title">{t("국가별 예측 비교")}</h2>
          <div className="forecast-details__scroll"><table><thead><tr><th scope="col">{t("국가")}</th><th scope="col">{t("기준 예측")}</th><th scope="col">{t("조건 변경 후")}</th><th scope="col">{t("예상 변화")}</th></tr></thead><tbody>{COUNTRIES.map(item => <tr key={item.code}><th scope="row">{t(item.name)}</th><td>—</td><td>—</td><td>—</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </div>
  </article>;
}
