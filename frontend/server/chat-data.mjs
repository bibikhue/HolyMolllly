import { demoMonths, selectableMonths, changeRate, numberLabel, rateLabel, monthLabel } from '../src/data/visitorDemo.js'
import { groupMarkets } from '../src/data/tourismMarkets.js'
import { koreaDate, nextCalendarMonth } from '../src/data/miceEvents.js'
import { monthCounts } from '../src/data/eventCalendar.js'

export const visitorSource = { id: 'visitors', label: '방문객 예시 데이터 · 2024–2025', url: '/#/visitors', kind: 'demo' }
export const scopeSource = { id: 'scope', label: '프로젝트 분석 범위', url: '/#/project', kind: 'project' }
export const countryNames = { ALL: '전체', JP: '일본', CN: '중국', TW: '대만', US: '미국', HK: '홍콩', ETC: '기타' }

export function visitorFacts({ start, end, country = 'ALL' }) {
  if (!selectableMonths.includes(start) || !selectableMonths.includes(end) || start > end || !Object.hasOwn(countryNames, country)) return { available: false, reason: '조회 가능한 방문객 자료는 2024년 1월부터 2025년 12월까지의 예시 데이터입니다.', sources: [visitorSource] }
  const value = (row) => row ? country === 'ALL' ? row.visitors : row.countries.find(c => c.code === country).visitors : null
  const rows = demoMonths.filter(row => row.month >= start && row.month <= end).map(row => {
    const previous = demoMonths.find(item => item.month === `${Number(row.month.slice(0, 4)) - 1}${row.month.slice(4)}`)
    const previousMonth = demoMonths[demoMonths.indexOf(row) - 1]
    return { month: row.month, visitors: value(row), previousYear: value(previous), yoy: changeRate(value(row), value(previous)), mom: changeRate(value(row), value(previousMonth)) }
  })
  const total = rows.reduce((sum, row) => sum + row.visitors, 0)
  const previousTotal = rows.reduce((sum, row) => sum + row.previousYear, 0)
  const allRows = demoMonths.filter(row => row.month >= start && row.month <= end)
  const allTotal = allRows.reduce((sum, row) => sum + row.visitors, 0)
  const countries = allRows[0].countries.map(c => ({ code: c.code, name: c.name, visitors: allRows.reduce((sum, row) => sum + row.countries.find(item => item.code === c.code).visitors, 0) })).map(c => ({ ...c, share: c.visitors / allTotal * 100 })).sort((a, b) => b.visitors - a.visitors)
  return { available: true, isDemo: true, start, end, country: countryNames[country], unit: '명', total, totalGrowth: changeRate(total, previousTotal), latest: rows.at(-1), peak: rows.reduce((best, row) => row.visitors > best.visitors ? row : best), rows, countries, regions: groupMarkets(countries), note: '화면 미리보기용 합성 자료이며 실제 관광 통계가 아닙니다. 월별 합산이므로 기간 전체 중복 제거 인원이 아닙니다.', sources: [visitorSource] }
}

export function projectFacts() {
  return { scope: '부산 전체 외국인 관광수요의 월별 방문 현황, 국가·출발 권역, 계절성·변동성, 방문 비중, 분석 리포트와 수요 전망', visitorData: '2024–2025 조회용 예시 자료. 실제 통계 미연동.', eventData: '부산 MICE 플랫폼 공식 행사 일정. 6시간 캐시, 원본 변경 가능.', forecasts: '검증된 예측 모델 및 결과 미연동. 다음 달 국가 순위를 제공할 수 없음.', consumption: '소비 자료 미확보. 국가별 소비 구조 군집 또는 개인별 소비 유형 군집은 자료 확보 후 검토.', districts: '부산 내 구·군 자료 미연동. 출발 국가의 지리적 권역과 구분.', sources: [scopeSource] }
}

export async function eventFacts({ month, date = null, keyword = null, type = null }, getMonth) {
  const snapshot = await getMonth(month)
  if (date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 7) !== month || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) throw new Error('날짜가 조회 월에 포함되지 않습니다.')
  if (keyword !== null && (typeof keyword !== 'string' || keyword.length > 100)) throw new Error('행사 검색어가 너무 깁니다.')
  if (type !== null && !['전시회', '회의', '이벤트·공연', '컨퍼런스'].includes(type)) throw new Error('지원하지 않는 행사 유형입니다.')
  const events = snapshot.events.filter(e => (!date || (e.start <= date && e.end >= date)) && (!keyword || e.title.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())) && (!type || e.type === type))
  const daily = monthCounts(snapshot.events, month, type || '전체')
  const max = Math.max(0, ...daily.map(day => day.count))
  const sources = [{ id: 'mice', label: '부산 MICE 플랫폼 · 공식 행사 일정', url: snapshot.sourceUrl, kind: 'official', fetchedAt: snapshot.fetchedAt, stale: snapshot.stale }, ...events.slice(0, 5).map(e => ({ id: `event-${e.id}`, label: e.title, url: e.url, kind: 'official' }))]
  return { available: true, month, date, keyword, type, matchedTotal: events.length, monthTotal: snapshot.events.length, peakConcurrentEvents: max, peakDates: daily.filter(day => day.count === max && max > 0).map(day => day.date), dailyCounts: daily, events: events.slice(0, 20), truncated: events.length > 20, fetchedAt: snapshot.fetchedAt, stale: snapshot.stale, note: '동시 진행 행사 건수이며 관광객 수나 혼잡도 추정값이 아닙니다. 여러 날 진행되는 행사는 각 날짜에 포함됩니다.', sources }
}

export function questionMonth(question, today, fallback) {
  if (/다음\s*달/.test(question)) return nextCalendarMonth(today)
  if (/이번\s*달/.test(question)) return today.slice(0, 7)
  const explicit = question.match(/(20\d{2})[년\s./-]+(1[0-2]|0?[1-9])(?:월|(?=[\s./-]|$))/)
  if (explicit) return `${explicit[1]}-${explicit[2].padStart(2, '0')}`
  const short = question.match(/(1[0-2]|0?[1-9])월/)
  return short ? `${fallback.slice(0, 4)}-${short[1].padStart(2, '0')}` : fallback
}

// Transparent, limited data lookup when no LLM key is configured.
export async function lookupAnswer(question, getMonth, today = koreaDate()) {
  if (/예측|전망|소비|군집|구군|구·군|프로젝트|분석\s*범위/.test(question)) {
    const facts = projectFacts()
    const text = /소비|군집/.test(question) ? facts.consumption : /예측|전망/.test(question) ? facts.forecasts : facts.scope
    return { answer: text, sources: facts.sources, mode: 'lookup', dataKind: 'project' }
  }
  if (/행사|MICE|마이스|일정|전시|회의|공연|캘린더/i.test(question)) {
    const month = questionMonth(question, today, today.slice(0, 7))
    const day = question.match(/(\d{1,2})일/)
    const explicitDate = question.match(/(20\d{2}-\d{2}-\d{2})/)?.[1]
    const date = explicitDate || (day ? `${month}-${day[1].padStart(2, '0')}` : /오늘/.test(question) ? today : null)
    const type = /전시/.test(question) ? '전시회' : /회의/.test(question) ? '회의' : /공연/.test(question) ? '이벤트·공연' : null
    const facts = await eventFacts({ month, date, type }, getMonth)
    const lines = facts.events.slice(0, 5).map(e => `• ${e.title}\n  ${e.start} ~ ${e.end} · ${e.venue}`)
    const header = date ? `${date}에 진행 중인 ${type || '전체'} 행사는 ${facts.matchedTotal}건입니다.` : `${monthLabel(month)} ${type || '전체'} 등록 행사는 ${facts.matchedTotal}건입니다.`
    const peak = !date && facts.peakDates.length ? `\n동시 진행이 가장 많은 날은 ${facts.peakDates.join(', ')}이며 ${facts.peakConcurrentEvents}건입니다.` : ''
    return { answer: `${header}${peak}${lines.length ? '\n\n'+lines.join('\n') : ''}${facts.matchedTotal > 5 ? '\n\n일부 행사만 표시했습니다. 전체 일정은 출처 링크에서 확인하세요.' : ''}\n\n행사 건수는 실제 관광객 수나 혼잡도를 뜻하지 않습니다.${facts.stale ? '\n최신 조회에 실패하여 이전 자료를 표시했습니다.' : ''}`, sources: facts.sources, mode: 'lookup', dataKind: 'official' }
  }
  if (/방문|관광객|국가|권역|일본|중국|대만|미국|홍콩|몇\s*명|증감/.test(question)) {
    const end = questionMonth(question, today, selectableMonths.at(-1))
    const country = Object.entries(countryNames).find(([code, name]) => code !== 'ALL' && question.includes(name))?.[0] || 'ALL'
    const year = question.match(/(20\d{2})년(?:\s*(?:전체|누적|연간))?/)
    const annual = /연간|누적|전체\s*기간/.test(question) && !/\d월/.test(question)
    const facts = visitorFacts({ start: annual ? `${year?.[1] || end.slice(0, 4)}-01` : end, end: annual ? `${year?.[1] || end.slice(0, 4)}-12` : end, country })
    if (!facts.available) return { answer: facts.reason, sources: facts.sources, mode: 'lookup', dataKind: 'demo' }
    const ranking = /권역/.test(question) ? facts.regions : facts.countries.filter(c => c.code !== 'ETC')
    const text = /국가|권역|비중|어느/.test(question) && country === 'ALL' ? ranking.slice(0, 3).map((c, i) => `${i+1}. ${c.name}: ${numberLabel(c.visitors)}명 (${c.share.toFixed(1)}%)`).join('\n') : `${facts.country} 방문객은 ${numberLabel(facts.total)}명입니다.\n전년 동일 기간 대비 ${rateLabel(facts.totalGrowth)}입니다.`
    return { answer: `[예시 데이터] ${monthLabel(facts.start)}${facts.start !== facts.end ? ` ~ ${monthLabel(facts.end)}` : ''}\n${text}\n\n실제 관광 통계가 아닌 화면 미리보기용 데이터입니다.`, sources: facts.sources, mode: 'lookup', dataKind: 'demo' }
  }
  return { answer: '현재는 LLM 연결 전 데이터 조회 모드입니다. “최근 일본 방문객 수”, “이번 달 행사가 가장 많은 날”, “다음 달 행사 일정”처럼 질문해 주세요. 자유로운 질문 해석은 LLM 연결 후 지원합니다.', sources: [], mode: 'lookup', dataKind: 'none' }
}
