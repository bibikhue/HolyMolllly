import { useEffect, useState } from 'react'
import { changeRate, monthLabel, numberLabel, rateLabel } from '../data/visitorDemo.js'
import { forecastLabel, rangeLabel } from '../data/displayFormat.js'
import { loadForecastData, MODEL_NAMES } from '../data/forecastData.js'
import { addMonths } from '../data/forecastM1.js'

const rankDetailStyle = { margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.8 }
const countryDotStyle = color => ({ display: 'inline-block', width: 8, height: 8, marginRight: 7, borderRadius: '50%', backgroundColor: color })

function RankingList({ rows, kind }) {
  return <ol className="dashboard-market-list" style={{ margin: '20px 0 24px', gap: 17 }}>
    {rows.map((item, index) => <li key={item.country.code}>
      <span className="dashboard-market-rank">{String(index + 1).padStart(2, '0')}</span>
      <div className="dashboard-market-info">
        <div><strong><i aria-hidden="true" style={countryDotStyle(item.country.color)} />{item.country.name}</strong><span>{kind === 'volume' ? forecastLabel(item.row.forecast) : rateLabel(item.growth)}</span></div>
        <p style={rankDetailStyle}>{kind === 'actual' ? `최근 실제 방문객 ${numberLabel(item.country.visitors)}명` : <>{kind === 'growth' && <>예상 방문객 {forecastLabel(item.row.forecast)} · </>}80% 범위 {rangeLabel(item.row, 80)} · 95% 범위 {rangeLabel(item.row, 95)}</>}</p>
      </div>
    </li>)}
  </ol>
}

export default function DemandOutlook() {
  const [ranking, setRanking] = useState('volume')
  const [load, setLoad] = useState({ data: null, error: null })
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    loadForecastData({ signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setLoad({ data, error: null })
    }).catch(error => {
      if (!controller.signal.aborted) setLoad({ data: null, error: error.message || '예측 자료를 불러오지 못했습니다.' })
    })
    return () => controller.abort()
  }, [retry])

  const data = load.data
  const firstForecast = data?.forecasts.find(row => row.origin_month === data.asOf && row.model === 'M1' && row.country_code === 'ALL' && row.horizon === 1)
  const targetMonth = firstForecast?.target_month
  const countryByCode = new Map(data?.countryOptions.map(country => [country.code, country]) || [])
  const volumeRows = data?.forecasts.filter(row => row.origin_month === data.asOf && row.target_month === targetMonth && row.horizon === 1 && row.model === 'M1' && row.country_code !== 'ALL' && row.country_code !== 'ETC')
    .map(row => ({ row, country: countryByCode.get(row.country_code) }))
    .filter(item => item.country)
    .sort((a, b) => b.row.forecast - a.row.forecast || a.country.code.localeCompare(b.country.code))
    .slice(0, 3) || []

  const latestActual = data?.history.find(row => row.month === data.asOf)
  const previousActual = data?.history.find(row => row.month === addMonths(data.asOf, -12))
  const priorTargetActual = data?.history.find(row => row.month === addMonths(targetMonth, -12))
  const recentRows = latestActual?.countries.filter(country => country.code !== 'ETC')
    .map(country => ({ country, growth: changeRate(country.visitors, previousActual?.countries.find(item => item.code === country.code)?.visitors) }))
    .filter(item => item.growth !== null)
    .sort((a, b) => b.growth - a.growth || b.country.visitors - a.country.visitors || a.country.code.localeCompare(b.country.code))
    .slice(0, 3) || []

  const otherModels = new Set(data?.forecasts.filter(row => row.origin_month === data.asOf && row.model !== 'M1').map(row => row.model) || [])
  // M1 repeats last year's value, so it cannot rank predicted year-over-year growth.
  const bestAccuracy = data?.accuracy.filter(row => row.country_code === 'ALL' && row.horizon === 1 && otherModels.has(row.model))
    .sort((a, b) => a.mape - b.mape || a.model.localeCompare(b.model))[0]
  const selectedModelForecasts = bestAccuracy ? data.forecasts.filter(row => row.origin_month === data.asOf && row.target_month === targetMonth && row.horizon === 1 && row.model === bestAccuracy.model && row.country_code !== 'ALL' && row.country_code !== 'ETC') : []
  const comparableCodes = data?.countryOptions.filter(country => country.code !== 'ALL' && country.code !== 'ETC').map(country => country.code) || []
  const completeModel = comparableCodes.length > 0 && comparableCodes.every(code => selectedModelForecasts.some(row => row.country_code === code))
  const modelRows = completeModel && priorTargetActual ? selectedModelForecasts
    .map(row => ({ row, country: countryByCode.get(row.country_code), growth: changeRate(row.forecast, priorTargetActual.countries.find(item => item.code === row.country_code)?.visitors) }))
    .filter(item => item.country && item.growth !== null)
    .sort((a, b) => b.growth - a.growth || b.row.forecast - a.row.forecast || a.country.code.localeCompare(b.country.code))
    .slice(0, 3) : []

  return <div className="dashboard-outlook-grid">
    <section className="overview-panel dashboard-forecast" aria-labelledby="forecast-title">
      <div className="panel-heading"><div><h2 id="forecast-title">다음 달 주목할 국가</h2><p>{targetMonth ? `${monthLabel(targetMonth)} 전망 · 방문객 자료 ${monthLabel(data.asOf)} 기준` : '예측 자료 확인 중'}</p></div><span className="panel-badge">{ranking === 'growth' && modelRows.length ? `${bestAccuracy.model} 예측 · 예시 자료` : '기준 예측(M1) · 예시 자료'}</span></div>
      <div className="chart-view-toggle forecast-ranking-toggle" aria-label="예측 순위 기준"><button type="button" aria-pressed={ranking === 'volume'} onClick={() => setRanking('volume')}>예상 방문 규모</button><button type="button" aria-pressed={ranking === 'growth'} onClick={() => setRanking('growth')}>전년 동월 대비 예상 증가율</button></div>
      {!data ? <div className="dashboard-forecast-empty" role={load.error ? 'alert' : 'status'}><p>{load.error || '예측 자료를 불러오고 있습니다.'}</p>{load.error && <button type="button" className="dashboard-detail-link" onClick={() => { setLoad({ data: null, error: null }); setRetry(value => value + 1) }}>다시 시도</button>}</div> :
        <div className="dashboard-forecast-empty" aria-live="polite">
          {ranking === 'volume' ? <>
            <h3>{monthLabel(targetMonth)} 예상 방문 규모 상위 3개국</h3>
            <p>기준 예측(M1)의 예상 방문객과 80%·95% 예측 범위입니다. 값과 범위는 천 명 단위로 반올림했습니다.</p>
            <RankingList rows={volumeRows} kind="volume" />
          </> : <>
            <h3>전년 동월 대비 예상 증가율</h3>
            {modelRows.length ? <>
              <p>분석팀 모형 중 부산 전체·1개월 뒤 MAPE가 가장 낮은 {bestAccuracy.model} · {MODEL_NAMES[bestAccuracy.model]} 예측을 사용했습니다.</p>
              <RankingList rows={modelRows} kind="growth" />
            </> : <>
              <p>{otherModels.size ? '분석팀 모형의 부산 전체 1개월 뒤 정확도와 국가별 예측값이 모두 준비되면 예상 증가율 순위를 표시합니다.' : '기준 예측(M1)은 작년 같은 달 값을 그대로 쓰므로 증가율을 예측하지 않습니다. 분석팀 모형 결과가 들어오면 표시됩니다.'}</p>
              <h3>최근 실적 · {monthLabel(data.asOf)} 전년 동월 대비 증가율 상위 3개국</h3>
              <p>아래는 예측이 아닌 최근 실제 방문객의 전년 동월 대비 증가율입니다.</p>
              <RankingList rows={recentRows} kind="actual" />
            </>}
          </>}
        </div>}
      <a className="dashboard-detail-link" href="#/outlook?focus=countries">국가별 방문객 전망 보기 ↗</a>
    </section>
  </div>
}
