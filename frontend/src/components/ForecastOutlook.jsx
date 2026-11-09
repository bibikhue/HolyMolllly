import { useEffect, useState } from 'react'
import { monthLabel, numberLabel } from '../data/visitorDemo.js'
import { forecastLabel, rangeLabel } from '../data/displayFormat.js'
import { loadForecastData, m1Improvement, MODEL_NAMES } from '../data/forecastData.js'
import { addMonths, summarizeBacktest } from '../data/forecastM1.js'
import { BacktestComparisonChart, ForecastBandChart } from './ForecastOutlookCharts.jsx'
import './ForecastOutlook.css'

const sections = [
  ['busan', '부산 방문객 전망'],
  ['countries', '국가별 방문객 전망'],
  ['accuracy', '예측 정확도'],
]
const validFocus = focus => sections.some(([key]) => key === focus) ? focus : 'busan'
const percent = value => value == null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
const hasNarrowRange = rows => rows.some(row =>
  row.forecast > 0 && (row.upper_80 - row.lower_80) / row.forecast < 0.01)

function SectionHeading({ title, description }) {
  return <div className="outlook-section-heading"><h2>{title}</h2><p>{description}</p></div>
}

function BusanSection({ data }) {
  const [choice, setChoice] = useState('M1')
  const availableModels = data.modelOptions.filter(model => data.forecasts.filter(row =>
    row.origin_month === data.asOf && row.country_code === 'ALL' && row.model === model).length === 12)
  const model = availableModels.includes(choice) ? choice : 'M1'
  const forecastRows = data.forecasts.filter(row => row.origin_month === data.asOf && row.country_code === 'ALL' && row.model === model)
    .sort((a, b) => a.horizon - b.horizon)
  const actualRows = data.history.slice(-24).map(row => ({ month: row.month, visitors: row.visitors }))
  const accuracyFor = horizon => data.accuracy.find(row => row.model === model && row.country_code === 'ALL' && row.horizon === horizon)
  const oneMonthValidation = data.backtest.filter(row => row.model === model && row.country_code === 'ALL' && row.horizon === 1)
  const summary = summarizeBacktest(oneMonthValidation)
  const firstForecast = forecastRows[0]
  const firstOutside = firstForecast && (firstForecast.forecast < firstForecast.lower_80 || firstForecast.forecast > firstForecast.upper_80)
  const biasDirection = summary.biasPercent > 0 ? '높았습니다' : summary.biasPercent < 0 ? '낮았습니다' : '같았습니다'
  const checkpoints = [1, 3, 6, 12].map(horizon => forecastRows.find(row => row.horizon === horizon)).filter(Boolean)

  return <section className="outlook-panel" id="outlook-busan" tabIndex={-1} aria-labelledby="outlook-busan-title">
    <div className="outlook-section-top"><SectionHeading title="부산 방문객 전망" description="최근 24개월 실제값과 향후 12개월의 기준 예측 및 범위를 함께 확인합니다." /><label className="outlook-field">사용 모형<select value={model} onChange={event => setChoice(event.target.value)} aria-label="부산 전망 모형">{availableModels.map(code => <option key={code} value={code}>{code} · {MODEL_NAMES[code]}</option>)}</select></label></div>
    <h2 id="outlook-busan-title" className="outlook-visually-hidden">부산 방문객 전망 결과</h2>
    <div className="outlook-method"><strong>{model === 'M1' ? '기준 예측(M1): 작년 같은 달 값을 그대로 사용' : `${model}: ${MODEL_NAMES[model]}`}</strong><span>예측 기준월 {monthLabel(data.asOf)} · 실제값 최종월 {monthLabel(data.asOf)} · 예측값과 범위는 천 명 단위로 반올림해 표시</span></div>
    <div className="outlook-chart-card"><div className="outlook-card-head"><h3>실제 방문객과 예측 범위</h3><p>점 예측은 80%·95% 범위와 함께 표시합니다.</p></div><ForecastBandChart actualRows={actualRows} forecastRows={forecastRows} /><div className="outlook-chart-legend"><span><i className="outlook-actual-line" />실제값</span><span><i className="outlook-forecast-line" />{model} 예측</span><span><i className="outlook-band-80" />80% 범위</span><span><i className="outlook-band-95" />95% 범위</span></div></div>
    <div className="outlook-validation-note"><strong>1개월 뒤 롤링 검증</strong><span>사례 {summary.n}건 · MAPE {summary.mape?.toFixed(1) ?? '—'}% · 편향 {percent(summary.biasPercent)}</span></div>
    {firstOutside && summary.biasPercent !== null && <p className="outlook-bias-note">{monthLabel(firstForecast.target_month)}의 점 예측은 80% 예측 범위 밖에 있습니다. 과거 1개월 뒤 검증에서 실제값이 {model === 'M1' ? '기준 예측' : '선택 모형의 예측'}보다 평균 {Math.abs(summary.biasPercent).toFixed(1)}% {biasDirection}.</p>}
    {checkpoints.some(row => (accuracyFor(row.horizon)?.n ?? 0) < 30) && <p className="outlook-caution">검증 사례가 적어 범위가 불안정할 수 있음</p>}
    {hasNarrowRange(forecastRows) && <p className="outlook-caution">예시 자료의 성장률이 일정해 범위가 실제보다 좁게 계산됩니다</p>}
    <div className="outlook-table-scroll" role="region" aria-label="부산 예측표 가로 스크롤" tabIndex="0"><table className="outlook-table"><caption>기준월에서 1·3·6·12개월 뒤 부산 전체 방문객 예측</caption><thead><tr><th scope="col">대상 월</th><th scope="col">기간</th><th scope="col">예측값</th><th scope="col">80% 범위</th><th scope="col">95% 범위</th><th scope="col">작년 같은 달 실제값</th><th scope="col">검증 n</th></tr></thead><tbody>{checkpoints.map(row => {
      const prior = data.history.find(item => item.month === addMonths(row.target_month, -12))
      return <tr key={row.horizon}><th scope="row">{monthLabel(row.target_month)}</th><td>{row.horizon}개월 뒤</td><td><strong>{forecastLabel(row.forecast)}</strong></td><td>{rangeLabel(row, 80)}</td><td>{rangeLabel(row, 95)}</td><td>{prior ? `${numberLabel(prior.visitors)}명` : '자료 없음'}</td><td>{accuracyFor(row.horizon)?.n ?? '—'}건</td></tr>
    })}</tbody></table></div>
    <p className="outlook-source-note">예측 범위는 같은 국가·예측 기간의 롤링 검증에서 (실제값 ÷ 예측값 − 1)의 경험적 10·90 및 2.5·97.5 분위수로 계산합니다. 점 예측이 범위의 중심에 있어야 한다고 가정하지 않습니다.</p>
  </section>
}

function CountriesSection({ data }) {
  const [countryChoice, setCountryChoice] = useState('JP')
  const [modelChoice, setModelChoice] = useState('M1')
  const country = data.countryOptions.find(item => item.code === countryChoice) || data.countryOptions[0]
  const countryOptions = data.countryOptions.filter(item => item.code !== 'ALL')
  const availableModels = data.modelOptions.filter(code => data.countryOptions.every(item =>
    data.forecasts.filter(row => row.origin_month === data.asOf && row.country_code === item.code && row.model === code).length === 12))
  const model = availableModels.includes(modelChoice) ? modelChoice : availableModels[0]
  const forecastRows = data.forecasts.filter(row => row.origin_month === data.asOf && row.country_code === country.code && row.model === model)
    .sort((a, b) => a.horizon - b.horizon)
  const actualRows = data.history.slice(-24).map(row => ({
    month: row.month,
    visitors: country.code === 'ALL' ? row.visitors : row.countries.find(item => item.code === country.code)?.visitors,
  }))
  const checkpoints = [1, 3, 6, 12].map(horizon => forecastRows.find(row => row.horizon === horizon)).filter(Boolean)
  const firstForecast = data.forecasts.find(row => row.origin_month === data.asOf && row.country_code === 'ALL' && row.model === model && row.horizon === 1)
  const comparison = countryOptions.map(item => ({
    country: item,
    row: data.forecasts.find(row => row.origin_month === data.asOf && row.country_code === item.code && row.model === model && row.horizon === 1),
  }))
  const priorMonth = firstForecast && addMonths(firstForecast.target_month, -12)
  const prior = data.history.find(row => row.month === priorMonth)
  const countrySum = comparison.reduce((sum, item) => sum + (item.row?.forecast || 0), 0)
  const firstSelected = forecastRows[0]
  const firstOutside = firstSelected && (firstSelected.forecast < firstSelected.lower_80 || firstSelected.forecast > firstSelected.upper_80)

  return <section className="outlook-panel" id="outlook-countries" tabIndex={-1} aria-labelledby="outlook-countries-title">
    <div className="outlook-section-top"><SectionHeading title="국가별 방문객 전망" description="국가별 다음 달 규모를 비교하고 선택한 국가의 향후 12개월 전망을 확인합니다." /><div className="outlook-filters"><label className="outlook-field">국가<select value={country.code} onChange={event => setCountryChoice(event.target.value)} aria-label="전망 국가">{data.countryOptions.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label className="outlook-field">사용 모형<select value={model} onChange={event => setModelChoice(event.target.value)} aria-label="국가별 전망 모형">{availableModels.map(code => <option key={code} value={code}>{code} · {MODEL_NAMES[code]}</option>)}</select></label></div></div>
    <h2 id="outlook-countries-title" className="outlook-visually-hidden">국가별 방문객 전망 결과</h2>
    <div className="outlook-method"><strong>{model === 'M1' ? '기준 예측(M1): 작년 같은 달 값을 그대로 사용' : `${model}: ${MODEL_NAMES[model]}`}</strong><span>예측 기준월 {monthLabel(data.asOf)} · 국가별 예측값은 각각 천 명 단위로 반올림해 표시</span></div>
    <div className="outlook-table-scroll" role="region" aria-label="국가별 다음 달 전망 비교표 가로 스크롤" tabIndex="0"><table className="outlook-table"><caption>{firstForecast ? monthLabel(firstForecast.target_month) : '다음 달'} 국가별 방문객 전망 · 기타 포함</caption><thead><tr><th scope="col">국가</th><th scope="col">작년 같은 달 실제값</th><th scope="col">예측값</th><th scope="col">부산 전체 내 비중</th><th scope="col">80% 범위</th></tr></thead><tbody>{comparison.map(({ country: item, row }) => <tr key={item.code}><th scope="row">{item.name}</th><td>{prior ? `${numberLabel(prior.countries.find(value => value.code === item.code)?.visitors)}명` : '자료 없음'}</td><td><strong>{row ? forecastLabel(row.forecast) : '자료 없음'}</strong></td><td>{row && firstForecast ? `${(row.forecast / firstForecast.forecast * 100).toFixed(1)}%` : '—'}</td><td>{row ? rangeLabel(row, 80) : '—'}</td></tr>)}</tbody><tfoot><tr><th scope="row">부산 전체</th><td>{prior ? `${numberLabel(prior.visitors)}명` : '자료 없음'}</td><td><strong>{firstForecast ? forecastLabel(firstForecast.forecast) : '자료 없음'}</strong></td><td>100%</td><td>{firstForecast ? rangeLabel(firstForecast, 80) : '—'}</td></tr></tfoot></table></div>
    {firstForecast && <p className="outlook-source-note">기타를 포함한 국가별 원자료 예측값 합계는 부산 전체와 {countrySum === firstForecast.forecast ? '일치합니다' : '일치하지 않습니다. 결과 파일을 확인해 주세요'}. 표시값은 국가별로 반올림되어 합산하면 차이가 날 수 있습니다.</p>}
    <div className="outlook-chart-card"><div className="outlook-card-head"><h3>{country.name} 실제 방문객과 예측 범위</h3><p>최근 24개월 실제값과 향후 12개월 점 예측·80%·95% 범위</p></div><ForecastBandChart actualRows={actualRows} forecastRows={forecastRows} color={country.color} model={model} /><div className="outlook-chart-legend"><span><i className="outlook-actual-line" />실제값</span><span><i className="outlook-forecast-line" style={{ borderColor: country.color }} />{model} 예측</span><span><i className="outlook-band-80" />80% 범위</span><span><i className="outlook-band-95" />95% 범위</span></div></div>
    {firstOutside && <p className="outlook-bias-note">{monthLabel(firstSelected.target_month)}의 점 예측은 80% 예측 범위 밖에 있습니다. 과거 검증의 오차 분포가 한쪽으로 치우쳐 점 예측과 범위의 중심이 다를 수 있습니다.</p>}
    {hasNarrowRange([...forecastRows, ...comparison.map(item => item.row).filter(Boolean), firstForecast].filter(Boolean)) && <p className="outlook-caution">예시 자료의 성장률이 일정해 범위가 실제보다 좁게 계산됩니다</p>}
    <div className="outlook-table-scroll" role="region" aria-label="선택한 국가 예측표 가로 스크롤" tabIndex="0"><table className="outlook-table"><caption>{country.name} · 기준월에서 1·3·6·12개월 뒤 방문객 예측</caption><thead><tr><th scope="col">대상 월</th><th scope="col">기간</th><th scope="col">예측값</th><th scope="col">80% 범위</th><th scope="col">95% 범위</th><th scope="col">작년 같은 달 실제값</th></tr></thead><tbody>{checkpoints.map(row => {
      const history = data.history.find(item => item.month === addMonths(row.target_month, -12))
      const priorActual = history && (country.code === 'ALL' ? history.visitors : history.countries.find(item => item.code === country.code)?.visitors)
      return <tr key={row.horizon}><th scope="row">{monthLabel(row.target_month)}</th><td>{row.horizon}개월 뒤</td><td><strong>{forecastLabel(row.forecast)}</strong></td><td>{rangeLabel(row, 80)}</td><td>{rangeLabel(row, 95)}</td><td>{priorActual == null ? '자료 없음' : `${numberLabel(priorActual)}명`}</td></tr>
    })}</tbody></table></div>
    <p className="outlook-source-note">예측 범위는 선택한 국가와 예측 기간의 롤링 검증 잔차를 이용해 계산합니다. 범위는 국가별로 산정되어 부산 전체 범위와 합산되지 않습니다.</p>
  </section>
}

function ErrorList({ title, rows }) {
  return <div className="outlook-error-list"><h4>{title}</h4><ol>{rows.map(row => <li key={`${row.origin_month}|${row.target_month}`}><strong>{monthLabel(row.target_month)}</strong><span>실제 {numberLabel(row.actual)}명 · 예측 {forecastLabel(row.forecast)}</span><em>절대 백분율 오차 {row.errorPercent.toFixed(1)}%</em></li>)}</ol></div>
}

function AccuracySection({ data }) {
  const [countryCode, setCountryCode] = useState('ALL')
  const [modelChoice, setModelChoice] = useState('M1')
  const [horizon, setHorizon] = useState(1)
  const tableRows = data.accuracy.filter(row => row.country_code === countryCode)
    .sort((a, b) => a.model.localeCompare(b.model) || a.horizon - b.horizon)
  const models = [...new Set(tableRows.map(row => row.model))]
  const model = models.includes(modelChoice) ? modelChoice : 'M1'
  const validation = data.backtest.filter(row => row.country_code === countryCode && row.model === model && row.horizon === horizon)
  const ranked = validation.map(row => ({ ...row, errorPercent: Math.abs(row.actual - row.forecast) / row.actual * 100 }))
  const smallest = [...ranked].sort((a, b) => a.errorPercent - b.errorPercent || a.target_month.localeCompare(b.target_month)).slice(0, 3)
  const largest = [...ranked].sort((a, b) => b.errorPercent - a.errorPercent || a.target_month.localeCompare(b.target_month)).slice(0, 3)
  const country = data.countryOptions.find(item => item.code === countryCode)

  return <section className="outlook-panel" id="outlook-accuracy" tabIndex={-1} aria-labelledby="outlook-accuracy-title">
    <SectionHeading title="예측 정확도" description="롤링 원점 검증 결과를 M1 기준선과 비교합니다." />
    <h2 id="outlook-accuracy-title" className="outlook-visually-hidden">모형별 예측 정확도</h2>
    <div className="outlook-accuracy-note">M1은 기준선입니다. 12개월 이내의 모든 예측 기간에서 같은 대상 월에 작년 같은 달 값을 사용하므로, 기간이 달라도 점 예측값은 같습니다. 검증 그래프의 예측값은 천 명 단위로 반올림해 표시하고 실제값은 그대로 표시합니다. MAPE는 실제값 대비 절대 오차의 평균, RMSE는 인원 단위 오차, MASE는 각 기준월까지의 계절성 오차로 나눈 값입니다.</div>
    <div className="outlook-filters"><label className="outlook-field">국가<select value={countryCode} onChange={event => setCountryCode(event.target.value)} aria-label="정확도 국가">{data.countryOptions.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label className="outlook-field">그래프 모형<select value={model} onChange={event => setModelChoice(event.target.value)} aria-label="검증 그래프 모형">{models.map(code => <option key={code} value={code}>{code} · {MODEL_NAMES[code]}</option>)}</select></label><label className="outlook-field">그래프 예측 기간<select value={horizon} onChange={event => setHorizon(Number(event.target.value))} aria-label="검증 그래프 예측 기간">{Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}개월 뒤</option>)}</select></label></div>
    <div className="outlook-table-scroll" role="region" aria-label="모형별 정확도 표 가로 스크롤" tabIndex="0"><table className="outlook-table"><caption>{country.name} · 모형 × 예측 기간 정확도</caption><thead><tr><th scope="col">모형</th><th scope="col">국가</th><th scope="col">기간</th><th scope="col">검증 대상월</th><th scope="col">n</th><th scope="col">MAPE</th><th scope="col">RMSE</th><th scope="col">MASE</th><th scope="col">M1 대비 개선율</th><th scope="col">DM p값</th></tr></thead><tbody>{tableRows.map(row => {
      const improvement = m1Improvement(row, data.accuracy)
      return <tr key={`${row.model}|${row.country_code}|${row.horizon}`}><th scope="row">{row.model}</th><td>{country.name}</td><td>{row.horizon}개월</td><td>{row.test_start}~{row.test_end}</td><td>{row.n}</td><td>{row.mape.toFixed(1)}%</td><td>{numberLabel(Math.round(row.rmse))}명</td><td>{row.mase?.toFixed(2) ?? '—'}</td><td>{row.model === 'M1' ? '기준선' : improvement == null ? '비교 불가' : percent(improvement)}</td><td>{row.dm_pvalue_vs_m1 == null ? '—' : row.dm_pvalue_vs_m1.toFixed(3)}</td></tr>
    })}</tbody></table></div>
    <div className="outlook-chart-card"><div className="outlook-card-head"><h3>{country.name} · {model} · {horizon}개월 뒤 검증</h3><p>대상 월의 실제 방문객과 당시 기준월에 계산한 예측값</p></div><BacktestComparisonChart rows={validation} color={country.color} /><div className="outlook-chart-legend"><span><i className="outlook-actual-line" />실제값</span><span><i className="outlook-forecast-line" style={{ borderColor: country.color }} />예측값</span></div></div>
    <p className="outlook-source-note">오차가 작은 달과 큰 달은 선택한 모형·국가·예측 기간의 절대 백분율 오차 기준으로 계산합니다.</p>
    <div className="outlook-extremes"><ErrorList title="오차가 가장 작았던 달 3개" rows={smallest} /><ErrorList title="오차가 가장 컸던 달 3개" rows={largest} /></div>
  </section>
}

export default function ForecastOutlook({ focus = 'busan', navigationKey }) {
  const [load, setLoad] = useState(null)
  const [retry, setRetry] = useState(0)
  const data = load?.retry === retry ? load.data : null
  const error = load?.retry === retry ? load.error : null
  const activeFocus = validFocus(focus)

  useEffect(() => {
    const controller = new AbortController()
    loadForecastData({ signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setLoad({ retry, data: result })
    }).catch(failure => {
      if (!controller.signal.aborted) setLoad({ retry, error: failure.message || '예측 결과를 불러오지 못했습니다.' })
    })
    return () => controller.abort()
  }, [retry])

  useEffect(() => {
    if (!data) return
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`outlook-${activeFocus}`)
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeFocus, data, navigationKey])

  return <div className="outlook-page"><div className="outlook-shell">
    <nav className="outlook-breadcrumb" aria-label="현재 위치"><a href="#/">홈</a><span aria-hidden="true">›</span><span aria-current="page">관광수요 전망</span></nav>
    <div className="outlook-page-head"><div><h1>관광수요 전망</h1><span>실제 방문객 자료와 기준 예측의 범위·정확도를 확인합니다.</span></div><div className="outlook-reference"><strong>예측 기준월 {data ? monthLabel(data.asOf) : '불러오는 중'}</strong><span>{data?.sourceLabel || '방문객 자료 확인 중'}</span></div></div>
    <div className="outlook-demo-notice"><strong>예시 자료</strong><span>방문객 원자료는 화면 미리보기용 예시입니다. M1만 전년 동월값으로 계산했으며 M2~M8 분석 결과는 아직 연결되지 않았습니다.</span></div>
    <nav className="outlook-section-nav" aria-label="관광수요 전망 하위 메뉴">{sections.map(([key, label]) => <a key={key} href={`#/outlook?focus=${key}`} aria-current={activeFocus === key ? 'location' : undefined}>{label}</a>)}</nav>
    {!data ? error ? <div className="outlook-load" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div> : <p className="outlook-load" role="status">예측 자료를 불러오고 있습니다.</p> : <>
      {activeFocus === 'busan' && <BusanSection data={data} />}
      {activeFocus === 'countries' && <CountriesSection data={data} />}
      {activeFocus === 'accuracy' && <AccuracySection data={data} />}
      <p className="outlook-source-note">{data.sourceLabel} · 예측값과 범위는 검증된 실제 관광 통계가 아닌 예시 방문객 원자료에서 계산한 기준선입니다.</p>
    </>}
  </div></div>
}
