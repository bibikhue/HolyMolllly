import { MetricCard, MonthlyChart } from './VisitorOverview'
import { getOverview, selectableMonths, monthLabel, numberLabel } from '../data/visitorDemo'
import { tourismOverviewMock } from '../data/tourismOverviewMock.js'
import { billionWonLabel, billionWonNumber } from '../data/displayFormat.js'
import './DashboardHome.css'

const flagColors = {
  JP: ['#fff', '#bc002d'],
  CN: ['#de2910', '#ffde00'],
  TW: ['#fe0000', '#000095'],
  US: ['#b22234', '#fff', '#3c3b6e'],
  HK: ['#de2910', '#fff'],
}

function CountryFlag({ code }) {
  const colors = flagColors[code] || ['#d7e3ed', '#64809a']
  return <svg className={`dashboard-country-flag flag-${code}`} viewBox="0 0 30 20" role="img" aria-label={`${code} 국기`}>
    <rect width="30" height="20" rx="2" fill={colors[0]} />
    {code === 'JP' && <circle cx="15" cy="10" r="4.4" fill={colors[1]} />}
    {code === 'CN' && <><path d="m7 3 1 2 2 .2-1.6 1.3.5 2-1.9-1.1-1.8 1.1.5-2L5 5.2 7 5Z" fill={colors[1]} /><circle cx="13" cy="4" r=".8" fill={colors[1]} /><circle cx="16" cy="6" r=".8" fill={colors[1]} /><circle cx="16" cy="9" r=".8" fill={colors[1]} /><circle cx="13" cy="11" r=".8" fill={colors[1]} /></>}
    {code === 'TW' && <><rect width="13" height="9" rx="1" fill={colors[1]} /><circle cx="6.5" cy="4.5" r="2.2" fill="#fff" /></>}
    {code === 'US' && <><path d="M0 2h30M0 5h30M0 8h30M0 11h30M0 14h30M0 17h30" stroke="#b22234" strokeWidth="1.5" /><rect width="13" height="10" rx="1" fill={colors[2]} />{Array.from({ length: 6 }, (_, i) => <circle key={i} cx={2 + i % 3 * 3.5} cy={2 + Math.floor(i / 3) * 4} r=".55" fill="#fff" />)}</>}
    {code === 'HK' && <><path d="M15 10c-5-8-8 0 0 0 4-7 7-1 0 0 9-1 6 5 0 0 6 7-1 8 0 0-4 8-8 3 0 0-8 3-8-4 0 0-7-5 0-9 0 0Z" fill={colors[1]} transform="translate(15 10) scale(.52) translate(-15 -10)" /></>}
    {!flagColors[code] && <text x="15" y="14" textAnchor="middle" fontSize="9" fill={colors[1]}>{code}</text>}
  </svg>
}

export default function DashboardHome({ onOpen }) {
  const end = selectableMonths.at(-1)
  const start = `${end.slice(0, 4)}-01`
  const annual = getOverview(start, end)
  const annualSpending = tourismOverviewMock.monthly.filter(row => row.month >= start && row.month <= end).reduce((sum, row) => sum + row.spending, 0)
  const trendRows = getOverview(selectableMonths[Math.max(0, selectableMonths.length - 12)], end).rows
  const current = getOverview(end, end)
  const topMarkets = current.countries.filter(country => country.code !== 'ETC').slice(0, 3)
  const latestSpend = tourismOverviewMock.monthly.find(row => row.month === end)
  const industries = [...latestSpend.industries].sort((a, b) => b.spending - a.spending)
  const districts = [...latestSpend.districts].sort((a, b) => b.spending - a.spending)
  const industryMax = Math.max(...industries.map(row => row.spending))
  const districtMax = Math.max(...districts.map(row => row.spending))

  return <div className="visitor-overview dashboard-home">
    <div className="overview-container">
      <nav className="dashboard-audience-actions" aria-label="대상별 대시보드">
        <button type="button">부산시 관계자</button>
        <button type="button">소상공인</button>
        <button type="button">외국인 관광객</button>
      </nav>
      <div className="dashboard-home-grid">
        <aside className="dashboard-home-sidebar" aria-label="주요 관광 지표">
          <MetricCard icon="visitors" label="최근 1년 누적 방문객" value={(annual.total / 10000).toFixed(1)} unit="만 명" detail={`${monthLabel(start)} — ${monthLabel(end)} · 예시 자료`} accent />
          <section className="overview-panel dashboard-top-countries" aria-labelledby="home-countries-title">
            <div className="panel-heading"><div><h2 id="home-countries-title">방문객 수 상위 3개국</h2></div></div>
            <ol className="dashboard-country-row">{topMarkets.map((country, index) => <li key={country.code}>
              <span className="dashboard-country-rank">{String(index + 1).padStart(2, '0')}</span>
              <CountryFlag code={country.code} />
              <strong>{country.name}</strong>
              <span className="dashboard-country-visitors">{numberLabel(country.visitors)}<small>명</small></span>
            </li>)}</ol>
          </section>
          <MetricCard icon="spending" label="최근 1년 카드 소비액" value={billionWonLabel(annualSpending)} detail={`${monthLabel(start)} — ${monthLabel(end)} · 예시 자료`} />
          <section className="overview-panel dashboard-spending-panel" aria-labelledby="home-industry-title">
            <div className="panel-heading"><div><h2 id="home-industry-title">업종별 소비액</h2></div></div>
            <ol className="dashboard-spending-bars">{industries.map((item, index) => <li key={item.code}>
              <span className="dashboard-spending-rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="dashboard-spending-name">{item.name}</span>
              <span className="dashboard-spending-track" aria-hidden="true"><span style={{ width: `${item.spending / industryMax * 100}%`, background: item.color }} /></span>
              <strong>{billionWonNumber(item.spending)}</strong>
            </li>)}</ol>
          </section>
        </aside>
        <div className="dashboard-home-main">
          <section className="overview-panel dashboard-home-trend" aria-labelledby="home-trend-title">
            <div className="panel-heading"><div><h2 id="home-trend-title">최근 1년간 외국인 관광객 방문</h2></div></div>
            <MonthlyChart rows={trendRows} compare={false} compact />
          </section>
          <section className="overview-panel dashboard-spending-panel" aria-labelledby="home-district-title">
            <div className="panel-heading"><div><h2 id="home-district-title">구·군별 소비액</h2></div></div>
            <ol className="dashboard-spending-bars dashboard-district-bars">{districts.map((item, index) => <li key={item.name}>
              <span className="dashboard-spending-rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="dashboard-spending-name">{item.name}</span>
              <span className="dashboard-spending-track" aria-hidden="true"><span style={{ width: `${item.spending / districtMax * 100}%` }} /></span>
              <strong>{billionWonNumber(item.spending)}</strong>
            </li>)}</ol>
            <p className="dashboard-spending-footnote">구·군별 소비액은 예시 배분값입니다.</p>
          </section>
        </div>
      </div>
    </div>
  </div>
}
