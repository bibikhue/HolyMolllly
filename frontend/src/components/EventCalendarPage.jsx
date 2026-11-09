import MiceCalendar from './MiceCalendar'
import './EventCalendarPage.css'

export default function EventCalendarPage() {
  return <div className="events-page"><div className="overview-container">
    <div className="overview-breadcrumb"><a href="#/">홈</a><span>›</span><span aria-current="page">부산 행사 캘린더</span></div>
    <div className="overview-title-row"><div><h1>부산 행사 캘린더</h1><p className="overview-subtitle">전시·회의·공연 일정을 월별로 살펴보고, 행사가 겹치는 날짜를 확인하세요.</p></div><span className="events-source-badge">부산 MICE 플랫폼 · 공식 일정</span></div>
    <div className="events-page-guide"><span aria-hidden="true">▦</span><p>달력의 날짜를 선택하면 해당 날짜에 진행 중인 행사를 확인할 수 있습니다. 색이 진할수록 동시에 진행되는 행사가 많습니다.</p></div>
    <MiceCalendar />
  </div></div>
}
