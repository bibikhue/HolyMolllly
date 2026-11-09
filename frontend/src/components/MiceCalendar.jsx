import { useEffect, useState } from 'react'
import { koreaDate } from '../data/miceEvents'
import { monthLabel } from '../data/visitorDemo'
import { calendarDays, eventsOnDay, monthCounts, shiftMonth } from '../data/eventCalendar'
import './MiceCalendar.css'

const sourceUrl = 'https://www.busanmice.or.kr/portal/evntInfo/list.do?mid=0203000000'
const categories = ['전체', '전시회', '회의', '이벤트·공연', '컨퍼런스']
const formatDate = (date) => date.replaceAll('-', '.')

export default function MiceCalendar() {
  const today = koreaDate()
  const thisMonth = today.slice(0, 7)
  const [month, setMonth] = useState(thisMonth)
  const [selected, setSelected] = useState(today)
  const [category, setCategory] = useState('전체')
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(0)
  const options = Array.from({ length: 25 }, (_, i) => shiftMonth(thisMonth, i - 12))
  const current = result?.month === month && result?.retry === retry ? result : null
  const data = current?.data
  const loading = !current
  const events = data?.events ?? []
  const counts = monthCounts(events, month, category)
  const peak = Math.max(0, ...counts.map((day) => day.count))
  const peakDays = counts.filter((day) => day.count === peak && peak > 0)
  const selectedEvents = eventsOnDay(events, selected, category)
  const total = events.filter((event) => category === '전체' || event.type === category).length

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new DOMException('일정 조회 시간 초과', 'TimeoutError')), 90_000)
    fetch(`/api/mice/month?month=${month}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '일정 조회에 실패했습니다.')
        if (payload.month !== month || !Array.isArray(payload.events)) throw new Error('일정 응답을 확인할 수 없습니다.')
        return payload
      })
      .then((payload) => { if (!controller.signal.aborted) setResult({ month, retry, data: payload }) })
      .catch((error) => { if (error.name !== 'AbortError' || controller.signal.reason?.name === 'TimeoutError') setResult({ month, retry, error: '행사 일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }) })
      .finally(() => clearTimeout(timeout))
    return () => { clearTimeout(timeout); controller.abort() }
  }, [month, retry])

  const changeMonth = (value) => { setMonth(value); setSelected(value === thisMonth ? today : `${value}-01`) }
  return <section className="overview-panel mice-calendar" aria-labelledby="mice-calendar-title">
    <div className="panel-heading"><div><h2 id="mice-calendar-title">부산 행사 캘린더</h2><p>행사가 겹치는 날짜와 개최 일정을 확인하세요.</p></div><a className="dashboard-detail-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">공식 일정 ↗</a></div>
    <div className="mice-calendar-toolbar"><div className="mice-month-controls"><button aria-label="이전 달" disabled={month === options[0]} onClick={() => changeMonth(shiftMonth(month, -1))}>‹</button><label><span className="visually-hidden">행사 조회 월</span><select aria-label="행사 조회 월" value={month} onChange={(event) => changeMonth(event.target.value)}>{options.map((option) => <option key={option} value={option}>{monthLabel(option)}</option>)}</select></label><button aria-label="다음 달" disabled={month === options.at(-1)} onClick={() => changeMonth(shiftMonth(month, 1))}>›</button><button className="mice-current-month" onClick={() => changeMonth(thisMonth)}>이번 달</button></div><label className="mice-category"><span className="visually-hidden">행사 유형</span><select aria-label="행사 유형" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <div className="mice-status" role="status" aria-live="polite">{loading ? '공식 행사 일정을 불러오는 중입니다…' : current.error ? <>{current.error} <button onClick={() => setRetry(retry + 1)}>다시 시도</button></> : <>{monthLabel(month)} 등록 행사 <strong>{total}건</strong>{peak > 0 && <> · 동시 진행 최대 <strong>{peak}건</strong> <span>({Number(peakDays[0].date.slice(8))}일{peakDays.length > 1 ? ` 외 ${peakDays.length - 1}일` : ''})</span></>}</>}</div>
    <div className="mice-calendar-body"><div className="mice-month-grid">
    <div className="mice-weekdays" aria-hidden="true">{['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="mice-calendar-days" role="group" aria-label={`${monthLabel(month)} 날짜별 동시 진행 행사`} aria-busy={loading}>{calendarDays(month).map((date, i) => {
      if (!date) return <span className="mice-blank-day" key={`empty-${i}`} />
      const count = counts.find((day) => day.date === date).count
      const level = count >= 30 ? 4 : count >= 20 ? 3 : count >= 10 ? 2 : count > 0 ? 1 : 0
      return <button key={date} className={`mice-day mice-density-${data ? level : 0}${date === selected ? ' selected' : ''}${date === today ? ' today' : ''}`} aria-pressed={date === selected} aria-label={`${formatDate(date)}, ${data ? `동시 진행 ${count}건` : '일정 미확인'}`} onClick={() => setSelected(date)}><span>{Number(date.slice(8))}{date === today && <i aria-hidden="true" />}</span><small>{data ? count ? `${count}건` : '—' : '·'}</small></button>
    })}</div>
    <div className="mice-density-legend"><span>동시 진행</span>{[[0, '0건'], [1, '1–9건'], [2, '10–19건'], [3, '20–29건'], [4, '30건 이상']].map(([level, label]) => <span key={level}><i className={`mice-density-${level}`} />{label}</span>)}</div>
    </div><div className="mice-selected-events"><h3>{formatDate(selected)} <span>{data ? `${selectedEvents.length}건` : '조회 대기'}</span></h3>{loading ? <p className="mice-empty">일정을 불러오고 있습니다.</p> : current.error ? <p className="mice-empty">조회에 실패해 이 날짜의 행사 여부를 확인할 수 없습니다.</p> : selectedEvents.length ? <ul>{selectedEvents.map((event) => <li key={event.id}><span className="mice-event-type">{event.type}</span><div><a href={event.url} target="_blank" rel="noopener noreferrer">{event.title} ↗</a><p>{formatDate(event.start)} — {formatDate(event.end)} · {event.venue}</p></div></li>)}</ul> : <p className="mice-empty">선택한 날짜·유형에 등록된 행사가 없습니다.</p>}</div>
    </div><p className="dashboard-schedule-note mice-source-note">출처: 부산 MICE 플랫폼{data && <> · 갱신 {new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(data.fetchedAt))}{data.stale && <strong> · 최신 조회 실패, 이전 일정 표시 중</strong>}</>}<br />6시간 캐시로 조회합니다. 여러 날 진행되는 행사는 각 날짜에 포함됩니다. 행사 건수는 실제 관광객 수나 혼잡도를 뜻하지 않습니다.</p>
  </section>
}
