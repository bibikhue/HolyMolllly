import { useState } from 'react'
import { eventTrendCountries, eventTrendYear, getCountryVisitorTrend } from '../data/eventVisitorTrendData'
import { numberLabel } from '../data/visitorDemo'
import './EventVisitorTrend.css'

const levelLabels = { up: '↑ 증가', usual: '· 보통', down: '↓ 감소' }

export default function EventVisitorTrend() {
  const [countryCode, setCountryCode] = useState(eventTrendCountries[0]?.code ?? '')
  const selectedCountry = eventTrendCountries.find(country => country.code === countryCode)
  const trend = getCountryVisitorTrend(countryCode)

  return <section className="event-visitor-trend overview-panel" aria-labelledby="event-visitor-trend-title">
    <div className="event-visitor-heading">
      <div><p className="event-visitor-eyebrow">국가별 월간 방문객</p><h2 id="event-visitor-trend-title">방문 수준 살펴보기</h2></div>
      <span className="event-visitor-demo-badge">예시 자료</span>
    </div>
    <label className="event-visitor-country-label" htmlFor="event-visitor-country">국가 선택</label>
    <select id="event-visitor-country" className="event-visitor-country-select" value={countryCode} onChange={event => setCountryCode(event.target.value)}>
      {eventTrendCountries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
    </select>
    <div className="event-visitor-median"><span>{eventTrendYear}년 월별 중앙값</span><strong style={{ '--country-color': selectedCountry?.color }}>{numberLabel(trend.median)}명</strong></div>
    <ol className="event-visitor-months" aria-label={`${selectedCountry?.name ?? ''} ${eventTrendYear}년 월별 방문객 수준`}>
      {trend.monthly.map(item => <li key={item.month} className={`event-visitor-month event-visitor-${item.level}`}>
        <span className="event-visitor-month-name">{item.month}</span>
        <strong>{levelLabels[item.level]}</strong>
        <span className="event-visitor-count">{item.visitorsLabel}명</span>
      </li>)}
    </ol>
    <p className="event-visitor-note">중앙값보다 10% 넘게 많으면 증가, ±10% 안이면 보통, 10% 넘게 적으면 감소로 표시합니다. 전월 대비 증감이 아닌 월별 방문객 수준 비교이며, 예시 자료입니다.</p>
  </section>
}
