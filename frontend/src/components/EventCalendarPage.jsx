import MiceCalendar from './MiceCalendar'
import EventVisitorTrend from './EventVisitorTrend'
import './EventCalendarPage.css'

export default function EventCalendarPage() {
  return <div className="events-page"><div className="overview-container">
    <div className="overview-breadcrumb"><a href="#/">홈</a><span>›</span><span aria-current="page">부산 행사 캘린더</span></div>
    <div className="overview-title-row"><div><h1>부산 행사 캘린더</h1><p className="overview-subtitle">월별 부산 MICE 행사와 축제 일정을 살펴보고, 국가별 방문객 수준도 함께 확인하세요.</p></div><span className="events-source-badge">MICE · 부산시 축제 일정</span></div>
    <div className="events-page-guide"><span aria-hidden="true">▦</span><p>달력에서 월과 날짜를 선택하면 해당 일정이 표시됩니다. 오른쪽에서는 국가별 월간 방문객 수를 12개월 중앙값과 비교해 볼 수 있습니다.</p></div>
    <div className="events-insight-layout"><MiceCalendar /><EventVisitorTrend /></div>
  </div></div>
}
