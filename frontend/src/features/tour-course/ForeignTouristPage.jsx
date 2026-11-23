import { useState } from 'react'
import { attractionExamples, attractionThemes, lodgingExamples, transitExamples } from './touristExperienceMock.js'
import './ForeignTouristPage.css'

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

function MapBackdrop({ showSubway }) {
  return <svg className="tourist-map-backdrop" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect width="100" height="100" fill="#eaf4f7" />
    <path d="M5 22 11 17 17 17 23 12 30 14 36 10 42 13 48 8 56 11 62 8 70 13 77 9 84 13 91 20 95 26 92 32 96 38 91 44 94 50 88 56 92 63 85 68 83 76 76 79 71 87 63 84 57 92 49 88 43 93 37 86 30 89 24 82 18 84 14 77 8 73 10 66 5 60 9 54 4 47 10 40 7 34 12 28Z" fill="#f5f3e7" stroke="#b9cbbd" strokeWidth=".8" />
    <path d="M34 82 40 80 44 83 43 89 39 92 35 89Z" fill="#f5f3e7" stroke="#b9cbbd" strokeWidth=".55" />
    <path d="M7 25 21 30 32 25 40 32 50 23 61 29 73 23 89 27M9 39 22 42 34 36 44 42 54 35 66 39 81 33 93 37M8 53 19 50 29 56 42 49 54 55 67 48 80 52 91 47M12 69 24 64 35 70 47 62 58 69 71 61 86 66M22 16 24 30 19 42 23 53 20 65 25 80M39 12 37 26 43 38 38 51 44 64 39 82M56 12 53 28 59 40 54 54 60 67 57 86M75 13 71 28 77 39 72 51 78 64 73 78" fill="none" stroke="#ccd5c8" strokeWidth=".55" />
    <path d="M7 35C17 36 19 40 27 40S37 37 45 44 56 49 66 43 78 35 91 37M8 61C18 57 24 58 31 62S43 58 51 65 63 72 71 65 81 57 90 59" fill="none" stroke="#d1cdb8" strokeWidth=".85" />
    <path d="M6 44C14 46 18 50 19 60M86 13C85 20 89 25 94 28M9 75C16 73 20 76 24 82" fill="none" stroke="#a9cfdd" strokeWidth="1.1" />
    {showSubway && <g className="tourist-map-rail-lines"><path d="M48 12 48 27 44 39 44 48 37 57 29 63 22 68 18 80" className="tourist-map-line-one" /><path d="M24 39 34 43 44 48 56 49 66 49 73 41 78 31 82 27" className="tourist-map-line-two" /><path d="M78 31 83 22 87 13" className="tourist-map-line-east" /></g>}
    <text x="14" y="27" className="tourist-map-district">강서구</text><text x="29" y="36" className="tourist-map-district">사상구</text><text x="13" y="52" className="tourist-map-district">사하구</text><text x="24" y="57" className="tourist-map-district">서구</text><text x="27" y="65" className="tourist-map-district">중구</text><text x="35" y="62" className="tourist-map-district">동구</text><text x="42" y="43" className="tourist-map-district">부산진구</text><text x="51" y="38" className="tourist-map-district">연제구</text><text x="58" y="34" className="tourist-map-district">동래구</text><text x="66" y="24" className="tourist-map-district">금정구</text><text x="49" y="69" className="tourist-map-district">남구</text><text x="65" y="59" className="tourist-map-district">수영구</text><text x="79" y="31" className="tourist-map-district">해운대구</text><text x="82" y="17" className="tourist-map-district">기장군</text><text x="38" y="83" className="tourist-map-district">영도구</text><text x="36" y="26" className="tourist-map-district">북구</text>
    <text x="3" y="47" className="tourist-map-water-label">낙동강</text><text x="30" y="75" className="tourist-map-water-label">부산항</text><text x="88" y="88" className="tourist-map-water-label">동해</text>
    <text x="4" y="96" className="tourist-map-sea-label">부산 구·군 위치를 단순화한 예시 지도</text>
  </svg>
}

function MapMarker({ feature, onSelect }) {
  const isLodging = feature.markerType === 'lodging'
  const isAttraction = feature.markerType === 'attraction'
  const markerClass = isLodging || isAttraction ? feature.markerType : feature.type
  const name = isLodging ? `${feature.name}, ${feature.district}, ${feature.kind}` : isAttraction ? `${feature.name}, ${feature.district}, 관광지` : `${feature.name}, ${feature.line}`
  return <button
    type="button"
    className={`tourist-map-marker tourist-map-marker-${markerClass}`}
    style={{ left: `${feature.x}%`, top: `${feature.y}%` }}
    aria-label={name}
    onMouseEnter={() => onSelect(feature)}
    onMouseLeave={event => { if (document.activeElement !== event.currentTarget) onSelect(null) }}
    onFocus={() => onSelect(feature)}
    onBlur={event => { if (!event.currentTarget.matches(':hover')) onSelect(null) }}
    onClick={() => onSelect(feature)}
  >
    <span aria-hidden="true">{isLodging ? '⌂' : isAttraction ? '★' : feature.type === 'bus' ? 'B' : 'M'}</span>
  </button>
}

function LocationMap({ markerType, features, showIntro = true }) {
  const isLodging = markerType === 'lodging'
  const categoryLabel = isLodging ? '숙박시설' : '관광지'
  const [layers, setLayers] = useState({ facilities: true, bus: true, subway: true })
  const [selected, setSelected] = useState(null)
  const visibleMarkers = [
    ...(layers.facilities ? features.map(item => ({ ...item, markerType })) : []),
    ...transitExamples.filter(item => layers[item.type]),
  ]
  const toggleLayer = layer => setLayers(current => ({ ...current, [layer]: !current[layer] }))

  return <>
    {showIntro && <div className="tourist-feature-intro"><div><p className="tourist-feature-eyebrow">{isLodging ? '숙박과 이동 정보' : '관광지와 이동 정보'}</p><h2>{isLodging ? '주변 교통을 함께 보는 숙박 지도' : '관광지와 대중교통 위치 지도'}</h2><p>지도에서 {categoryLabel}과 버스·지하철 위치를 함께 확인할 수 있습니다. 표시를 가리키거나 선택해 예시 정보를 살펴보세요.</p></div><span className="tourist-demo-badge">예시 데이터</span></div>}
    <div className="tourist-map-layout">
      <section className="tourist-map-card" aria-label={`부산 ${categoryLabel} 및 대중교통 예시 지도`}>
        <div className="tourist-map-toolbar" aria-label="지도 표시 항목">
          <label><input type="checkbox" checked={layers.facilities} onChange={() => toggleLayer('facilities')} /><i className={`tourist-legend-dot ${markerType}`} />{categoryLabel}</label>
          <label><input type="checkbox" checked={layers.bus} onChange={() => toggleLayer('bus')} /><i className="tourist-legend-dot bus" />버스 정류장</label>
          <label><input type="checkbox" checked={layers.subway} onChange={() => toggleLayer('subway')} /><i className="tourist-legend-dot subway" />지하철역</label>
          {layers.subway && <span className="tourist-rail-legend"><i className="line-one" />1호선 <i className="line-two" />2호선 <i className="line-east" />동해선</span>}
        </div>
        <div className="tourist-map-plot">
          <MapBackdrop showSubway={layers.subway} />
          {visibleMarkers.map(feature => <MapMarker key={feature.id} feature={feature} onSelect={setSelected} />)}
          {selected && <div className="tourist-map-tooltip" style={{ left: `${Math.min(78, Math.max(23, selected.x))}%`, top: `${Math.min(84, Math.max(18, selected.y))}%` }} role="status">
            {selected.markerType === 'lodging' ? <><span className="tourist-tooltip-kicker">{selected.kind} · {selected.district}</span><strong>{selected.name}</strong><span>{selected.address}</span><span>{selected.price} · 평점 {selected.rating}</span><span>교통: {selected.subway}</span></> : selected.markerType === 'attraction' ? <><span className="tourist-tooltip-kicker">관광지 · {selected.district}</span><strong>{selected.name}</strong><span>{selected.description}</span><span>{selected.themes.join(' · ')}</span></> : <><span className="tourist-tooltip-kicker">{selected.type === 'bus' ? '버스 정류장' : '지하철역'}</span><strong>{selected.name}</strong><span>{selected.line}</span><span>위치는 예시 좌표입니다.</span></>}
          </div>}
        </div>
        <p className="tourist-map-disclaimer">예시 화면입니다. 지도 형상과 {categoryLabel}·정류장 위치 및 정보는 실제 데이터가 아닌 설명용 예시입니다.</p>
      </section>
      <aside className="tourist-map-side">
        <section className="tourist-map-info-card" aria-live="polite">
          {selected ? <>
            <span className="tourist-info-eyebrow">{selected.markerType === 'lodging' ? `숙박시설 · ${selected.district}` : selected.markerType === 'attraction' ? `관광지 · ${selected.district}` : selected.type === 'bus' ? '버스 정류장' : '지하철역'}</span>
            <h3>{selected.name}</h3>
            {selected.markerType === 'lodging' ? <><p>{selected.kind} · {selected.address}</p><dl><div><dt>1박 요금</dt><dd>{selected.price.replace('1박 예시 ', '')}</dd></div><div><dt>이용자 평점</dt><dd>{selected.rating} / 5</dd></div><div><dt>대중교통</dt><dd>{selected.subway}</dd></div></dl></> : selected.markerType === 'attraction' ? <><p>{selected.description}</p><div className="tourist-theme-tags">{selected.themes.map(theme => <span key={theme}>{theme}</span>)}</div></> : <p>{selected.line} · 위치는 예시 좌표입니다.</p>}
          </> : <><span className="tourist-info-eyebrow">지도 정보</span><h3>위치 표시를 선택해 보세요</h3><p>{categoryLabel} 마커에 마우스를 올리거나 키보드·터치로 선택하면 상세 정보를 볼 수 있습니다.</p></>}
        </section>
        <div className="tourist-map-counts"><strong>{categoryLabel} {features.length}곳</strong><span>버스·지하철 정류장 {transitExamples.length}곳</span></div>
      </aside>
    </div>
  </>
}

function AttractionsPanel() {
  const [theme, setTheme] = useState('전체')
  const filtered = attractionExamples.filter(item => theme === '전체' || item.themes.includes(theme))
  return <>
    <div className="tourist-feature-intro"><div><p className="tourist-feature-eyebrow">취향에 맞는 장소 찾기</p><h2>관심 주제로 부산 관광지 살펴보기</h2><p>주제를 선택하면 지도에 해당 관광지와 버스·지하철 위치를 함께 표시합니다.</p></div><span className="tourist-demo-badge">예시 데이터</span></div>
    <div className="tourist-theme-filters" role="group" aria-label="관광 주제 필터">{attractionThemes.map(item => <button key={item} type="button" aria-pressed={theme === item} onClick={() => setTheme(item)}>{item}</button>)}</div>
    <LocationMap markerType="attraction" features={filtered} showIntro={false} />
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

export default function ForeignTouristPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('lodging')
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
      <section id="foreign-tourist-panel-lodging" role="tabpanel" aria-labelledby="foreign-tourist-tab-lodging" tabIndex={0} hidden={activeTab !== 'lodging'}><LocationMap markerType="lodging" features={lodgingExamples} /></section>
      <section id="foreign-tourist-panel-attractions" role="tabpanel" aria-labelledby="foreign-tourist-tab-attractions" tabIndex={0} hidden={activeTab !== 'attractions'}><AttractionsPanel /></section>
      <section id="foreign-tourist-panel-routes" role="tabpanel" aria-labelledby="foreign-tourist-tab-routes" tabIndex={0} hidden={activeTab !== 'routes'}><RoutesPanel /></section>
    </div>
  </div>
}
