import { useState } from 'react'
import DemandOutlook from './DemandOutlook'
import { groupMarkets } from '../data/tourismMarkets'
import { MetricCard, MonthlyChart } from './VisitorOverview'
import { getOverview, selectableMonths, monthLabel, numberLabel, rateLabel } from '../data/visitorDemo'
import './DashboardHome.css'

export default function DashboardHome({ onOpen }) {
  const [marketView, setMarketView] = useState('country')
  const end = selectableMonths.at(-1)
  const start = `${end.slice(0, 4)}-01`
  const annual = getOverview(start, end)
  const visitorTrend = getOverview(selectableMonths[Math.max(0, selectableMonths.length - 12)], end).rows.map(row => ({ month: row.month, value: row.visitors }))
  const recent = getOverview(selectableMonths.at(-6), end)
  const current = getOverview(end, end)
  const topMarkets = current.countries.filter((country) => country.code !== 'ETC').slice(0, 3)
  const marketRows = marketView === 'country' ? topMarkets : groupMarkets(current.countries)
  const latest = annual.latest

  return <div className="visitor-overview dashboard-home">
    <div className="overview-container">
      <div className="overview-title-row"><div><h1>부산 관광 대시보드</h1><p className="overview-subtitle">최근 방문 흐름을 확인하고, 필요한 분석으로 바로 이동하세요.</p></div><span className="dashboard-reference">방문 지표 기준월 <strong>{monthLabel(end)}</strong></span></div>
      <div className="overview-demo-notice"><span>미리보기</span><p>방문객 지표는 <strong>예시 데이터</strong>입니다. 실제 관광 통계 연동 전 화면 미리보기용 자료입니다.</p><button onClick={() => onOpen('데이터 출처·기준')}>데이터 안내 ↗</button></div>
      <section className="overview-metrics" aria-label="최근 주요 방문 지표">
        <MetricCard icon="visitors" label="최근 월 방문객" value={numberLabel(latest.visitors)} unit="명" change={latest.yoy} detail="전년 동월 대비" accent trend={visitorTrend} />
        <MetricCard icon="calendar" label={`${end.slice(0, 4)}년 누적 방문객`} value={(annual.total / 10000).toFixed(1)} unit="만 명" change={annual.totalGrowth} detail="전년 동일 기간 대비" />
        <MetricCard icon="trend" label="최근 월 증감률" value={rateLabel(latest.mom)} detail="전월 대비" />
        <MetricCard icon="globe" label="최근 월 주요 방문 국가" value={topMarkets[0].name} unit={`${topMarkets[0].share.toFixed(1)}%`} detail="최근 월 전체 방문객 중 비중" />
      </section>
      <div className="dashboard-summary-grid">
        <section className="overview-panel" aria-labelledby="home-trend-title">
          <div className="panel-heading"><div><h2 id="home-trend-title">최근 방문 흐름</h2><p>최근 6개월 · 예시 데이터</p></div><a className="dashboard-detail-link" href="#/visitors">부산 관광 한눈에 ↗</a></div>
          <MonthlyChart rows={recent.rows} compare={false} />
        </section>
        <section className="overview-panel" aria-labelledby="home-markets-title">
          <div className="panel-heading"><div><h2 id="home-markets-title">주요 관광 시장</h2><p>{monthLabel(end)} 방문 비중 · 예시 데이터</p></div></div><div className="chart-view-toggle market-view-toggle" aria-label="관광 시장 구분"><button aria-pressed={marketView === 'country'} onClick={() => setMarketView('country')}>국가별</button><button aria-pressed={marketView === 'region'} onClick={() => setMarketView('region')}>권역별</button></div>
          <ol className="dashboard-market-list">{marketRows.map((country, index) => <li key={country.code}><span className="dashboard-market-rank">0{index + 1}</span><div className="dashboard-market-info"><div><strong>{country.name}</strong><span>{country.share.toFixed(1)}%</span></div><div className="dashboard-market-track"><span style={{ width: `${country.share}%`, background: country.color }} /></div></div></li>)}</ol>
          {marketView === 'region' && <p className="dashboard-region-note">출발 시장의 지리적 권역 기준입니다. 기타 국가는 권역을 알 수 없어 미분류로 유지합니다.</p>}
          <button className="dashboard-detail-link" onClick={() => onOpen('국가별 방문 규모')}>국가별 관광 살펴보기 ↗</button>
        </section>
      </div>
      <DemandOutlook onOpen={onOpen} />
      <section className="dashboard-analysis" aria-labelledby="home-analysis-title">
        <div className="dashboard-section-heading"><h2 id="home-analysis-title">분석 이어보기</h2><p>방문 현황에서 수요 전망과 분석 결과까지</p></div>
        <div className="dashboard-analysis-grid">
          <a className="dashboard-analysis-card" href="#/visitors"><span className="dashboard-card-category">방문 현황 <span>↗</span></span><h3>기간별로 자세히 살펴보기</h3><p>조회 기간을 선택하고 전년 비교, 상세 표와 CSV를 확인하세요.</p><span className="dashboard-card-action">부산 관광 한눈에</span></a>
          <a className="dashboard-analysis-card" href="#/outlook?focus=busan"><span className="dashboard-card-category">관광수요 전망 <span>기준 예측 제공</span></span><h3>관광의 다음 흐름</h3><p>기준 예측과 80%·95% 예측 범위, 예측 정확도를 확인하세요.</p><span className="dashboard-card-action">부산 방문객 전망 보기 ↗</span></a>
          <button className="dashboard-analysis-card" onClick={() => onOpen('자동 리포트')}><span className="dashboard-card-category">분석 리포트 <span>자동 요약</span></span><h3>변화를 읽는 인사이트</h3><p>기간과 국가를 선택해 방문 흐름과 시장 구성을 요약하세요.</p><span className="dashboard-card-action">자동 리포트 만들기 ↗</span></button>
        </div>
      </section>
      <div className="overview-source-note"><span>방문 지표: 월별 합산 기준 · 실제 자료 연동 전 · 화면 미리보기용 예시</span><button onClick={() => onOpen('분석 범위 안내')}>분석 범위 확인 ↗</button></div>
    </div>
  </div>
}
