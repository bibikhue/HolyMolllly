import { useState } from 'react'
import { attractionExamples, lodgingExamples, transitExamples } from './touristExperienceMock.js'
import './ForeignTouristPage.css'
import SubwayMap from "../../maps/subway/subway.jsx";

const tabs = [
  { id: 'lodging', label: '숙박 추천' },
  { id: 'attractions', label: '관광 추천' },
  { id: 'routes', label: '추천 관광경로' },
]

const routePlaces = [...attractionExamples, ...lodgingExamples, ...transitExamples]
const toMinutes = value => {
  if (!/^\d{2}:\d{2}$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}
const formatMinutes = value => `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
const estimateTripMinutes = (from, to) => Math.max(12, Math.round(Math.hypot(from.x - to.x, from.y - to.y) * 1.2) + 8)

function LocationMap() {
  return <>
    <div className="tourist-feature-intro"><div><p className="tourist-feature-eyebrow">부산 지하철 노선과 역</p><h2>노선별 색상으로 지하철 지도 보기</h2><p>노선을 선택해 표시를 조정하고, 노선이나 역에 마우스를 올려 이름을 확인할 수 있습니다.</p></div></div>
    <div className="tourist-map-layout">
      <section className="tourist-map-card" aria-label="부산 지하철 노선과 역 지도">
        <SubwayMap />
        <p className="tourist-map-disclaimer">역은 노선 색상의 점으로 표시합니다. 역 점에 커서를 올리면 역 이름과 노선명을 확인할 수 있습니다.</p>
      </section>
      <aside className="tourist-map-side">
        <section className="tourist-map-info-card">
          <span className="tourist-info-eyebrow">노선 정보</span>
          <h3>노선 색상과 필터</h3>
          <p>노선 필터에서 원하는 노선을 고를 수 있습니다. 지도 위의 선과 역 점에 커서를 올리면 이름이 표시됩니다.</p>
        </section>
      </aside>
    </div>
  </>
}

function RoutesPanel() {
  const [startTime, setStartTime] = useState('10:00')
  const [arrivalBy, setArrivalBy] = useState('18:00')
  const [startName, setStartName] = useState('서면역')
  const [destinationName, setDestinationName] = useState('해운대해수욕장')
  const [routePlan, setRoutePlan] = useState(null)
  const [routeError, setRouteError] = useState('')

  const recommendRoute = event => {
    event.preventDefault()
    const startAt = toMinutes(startTime)
    const finishBy = toMinutes(arrivalBy)
    if (startAt === null || finishBy === null || finishBy <= startAt) {
      setRouteError('도착 시간은 출발 시간보다 늦게 입력해 주세요.')
      setRoutePlan(null)
      return
    }
    const findPlace = name => routePlaces.find(place => place.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())
    const start = findPlace(startName)
    const destination = findPlace(destinationName)
    if (!start || !destination) {
      setRouteError('출발지와 도착지는 목록에서 예시 장소를 선택해 주세요.')
      setRoutePlan(null)
      return
    }
    if (start.id === destination.id) {
      setRouteError('출발지와 도착지를 서로 다른 장소로 입력해 주세요.')
      setRoutePlan(null)
      return
    }

    const available = finishBy - startAt
    const directMinutes = estimateTripMinutes(start, destination)
    if (directMinutes > available) {
      setRouteError('입력한 시간 안에 도착하기 어려운 예시 경로입니다. 시간을 늘리거나 가까운 도착지를 선택해 주세요.')
      setRoutePlan(null)
      return
    }

    const stops = []
    const visited = new Set([start.id, destination.id])
    let current = start
    let elapsed = 0
    while (stops.length < 4) {
      const candidate = attractionExamples
        .filter(place => !visited.has(place.id))
        .map(place => {
          const leg = estimateTripMinutes(current, place)
          const dwell = place.visitMinutes || 60
          const returnLeg = estimateTripMinutes(place, destination)
          const detour = leg + returnLeg - estimateTripMinutes(current, destination)
          return { place, leg, dwell, returnLeg, detour }
        })
        .filter(option => elapsed + option.leg + option.dwell + option.returnLeg <= available)
        .sort((a, b) => a.detour - b.detour || a.leg - b.leg || a.place.name.localeCompare(b.place.name))[0]
      if (!candidate) break
      stops.push({ ...candidate.place, legMinutes: candidate.leg, dwellMinutes: candidate.dwell })
      visited.add(candidate.place.id)
      elapsed += candidate.leg + candidate.dwell
      current = candidate.place
    }

    let clock = startAt
    let from = start
    const schedule = [{ id: `start-${start.id}`, type: 'start', name: start.name, time: formatMinutes(clock), detail: '출발' }]
    stops.forEach(stop => {
      clock += estimateTripMinutes(from, stop)
      schedule.push({ id: stop.id, type: 'visit', name: stop.name, time: formatMinutes(clock), detail: `${stop.visitMinutes || 60}분 둘러보기 · ${stop.district}` })
      clock += stop.visitMinutes || 60
      from = stop
    })
    clock += estimateTripMinutes(from, destination)
    schedule.push({ id: `end-${destination.id}`, type: 'end', name: destination.name, time: formatMinutes(clock), detail: '도착' })
    setRouteError('')
    setRoutePlan({ schedule, start, destination, arrivalBy, stopCount: stops.length, arrivalTime: formatMinutes(clock), availableMinutes: available })
  }

  return <>
    <div className="tourist-feature-intro"><div><p className="tourist-feature-eyebrow">입력한 시간에 맞춰 일정 구성</p><h2>출발지에서 도착지까지 부산 관광경로</h2><p>출발·도착 시간과 장소를 입력하면, 도착 희망 시간 안에 들를 수 있는 예시 관광 코스를 추천합니다.</p></div><span className="tourist-demo-badge">예시 데이터</span></div>
    <form className="tourist-route-form" onSubmit={recommendRoute}>
      <div className="tourist-route-time-fields">
        <label>출발 시간<input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} required /></label>
        <label>도착 희망 시간<input type="time" value={arrivalBy} onChange={event => setArrivalBy(event.target.value)} required /></label>
      </div>
      <div className="tourist-route-place-fields">
        <label>출발 위치<input type="text" list="tourist-route-place-options" value={startName} onChange={event => setStartName(event.target.value)} placeholder="예: 서면역" required /></label>
        <span className="tourist-route-arrow" aria-hidden="true">→</span>
        <label>도착 위치<input type="text" list="tourist-route-place-options" value={destinationName} onChange={event => setDestinationName(event.target.value)} placeholder="예: 해운대해수욕장" required /></label>
      </div>
      <datalist id="tourist-route-place-options">{routePlaces.map(place => <option key={place.id} value={place.name}>{place.district || place.line}</option>)}</datalist>
      <button className="tourist-route-submit" type="submit">입력한 시간에 맞춰 경로 추천</button>
      {routeError && <p className="tourist-route-error" role="alert">{routeError}</p>}
    </form>
    {routePlan && <section className="tourist-route-result" aria-live="polite">
      <div className="tourist-route-result-heading"><div><span className="tourist-info-eyebrow">추천 경로 · 예시 계산</span><h3>{routePlan.start.name}에서 {routePlan.destination.name}까지</h3></div><div className="tourist-route-arrival"><small>도착 예상</small><strong>{routePlan.arrivalTime}</strong></div></div>
      <p className="tourist-route-result-summary">{startTime} 출발 · 관광지 {routePlan.stopCount}곳 경유 · {routePlan.arrivalBy}까지 도착</p>
      <ol className="tourist-route-stops">{routePlan.schedule.map((item, index) => <li key={item.id} className={`route-stop-${item.type}`}><time>{item.time}</time><span className="tourist-route-stop-number">{item.type === 'start' ? '출발' : item.type === 'end' ? '도착' : String(index).padStart(2, '0')}</span><div><strong>{item.name}</strong><small>{item.detail}</small></div></li>)}</ol>
      <p className="tourist-route-disclaimer">이동·관광 소요시간은 예시 좌표와 고정 체류시간으로 계산한 미리보기입니다. 실제 교통 상황과 다를 수 있습니다.</p>
    </section>}
  </>
}

export default function ForeignTouristPage({ onBack, initialTab = 'lodging' }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const handleTabKeyDown = (event, index) => {
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
    if (nextIndex < 0) return
    event.preventDefault()
    setActiveTab(tabs[nextIndex].id)
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[nextIndex]?.focus()
  }
  return <div className="visitor-overview foreign-tourist-page">
    <div className="overview-container">
      <button className="tourist-back-button" type="button" onClick={onBack}>← 메인 화면</button>
      <div className="tourist-page-heading"><p>외국인 관광객</p><h1>부산 여행 도우미</h1><span>숙박과 관광 정보를 살펴보고 여행 경로를 구성하는 기능을 소개합니다.</span></div>
      <div className="foreign-tourist-tabs" role="tablist" aria-label="외국인 관광객 기능">{tabs.map((tab, index) => <button key={tab.id} id={`foreign-tourist-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`foreign-tourist-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={event => handleTabKeyDown(event, index)}>{tab.label}</button>)}</div>
      {activeTab === 'lodging' && <section id="foreign-tourist-panel-lodging" role="tabpanel" aria-labelledby="foreign-tourist-tab-lodging" tabIndex={0}><LocationMap /></section>}
      {activeTab === 'attractions' && <section id="foreign-tourist-panel-attractions" role="tabpanel" aria-labelledby="foreign-tourist-tab-attractions" tabIndex={0}><LocationMap /></section>}
      {activeTab === 'routes' && <section id="foreign-tourist-panel-routes" role="tabpanel" aria-labelledby="foreign-tourist-tab-routes" tabIndex={0}><RoutesPanel /></section>}
      
    </div>
  </div>
}
