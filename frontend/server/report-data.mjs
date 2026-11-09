import { visitorFacts, countryNames } from './chat-data.mjs'
import { selectableMonths, monthLabel, numberLabel, rateLabel } from '../src/data/visitorDemo.js'
import { loadTourismOverviewData } from '../src/data/tourismOverviewData.js'
import { loadCountryTourismData } from '../src/data/countryTourismData.js'
import { normalizeForecastData } from '../src/data/forecastData.js'
import { summarizeBacktest } from '../src/data/forecastM1.js'
import { billionWonLabel, wonLabel, forecastLabel, rangeLabel } from '../src/data/displayFormat.js'
import { monthCounts } from '../src/data/eventCalendar.js'
import { koreaDate } from '../src/data/miceEvents.js'

export const reportFocus = { overview: '관광수요 주요 변화', markets: '국가별 수요 특징', implications: '정책·마케팅 시사점' }
export function validateReportOptions(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(k => !['start','end','country','focus','eventMonth'].includes(k))) throw new Error('Invalid report options')
  const { start, end, country = 'ALL', focus = 'overview', eventMonth = null } = payload
  if (!selectableMonths.includes(start) || !selectableMonths.includes(end) || start > end || !Object.hasOwn(countryNames, country) || !Object.hasOwn(reportFocus, focus)) throw new Error('Invalid report range')
  if (eventMonth !== null) {
    const current = koreaDate().slice(0, 7)
    const monthIndex = value => Number(value.slice(0, 4)) * 12 + Number(value.slice(5))
    if (typeof eventMonth !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(eventMonth) || Math.abs(monthIndex(eventMonth) - monthIndex(current)) > 12) throw new Error('Invalid event month')
  }
  return { start, end, country, focus, eventMonth }
}

export async function reportEvidence(options, getMonth) {
  const visitors = visitorFacts(options)
  if (!visitors.available) throw new Error('Visitor data unavailable')
  const [consumptionData, forecastData] = await Promise.all([
    options.country === 'ALL' ? loadTourismOverviewData() : loadCountryTourismData(),
    Promise.resolve(normalizeForecastData()),
  ])
  const isCitywide = options.country === 'ALL'
  const scope = isCitywide ? '부산 전체' : visitors.country
  const consumptionRows = (isCitywide ? consumptionData.monthly : consumptionData.months)
    .filter(row => row.month >= options.start && row.month <= options.end)
    .map(row => isCitywide ? row : { ...row.countries.find(country => country.code === options.country), month: row.month })
  if (!consumptionRows.length || consumptionRows.some(row => !row || !Number.isFinite(row.spending))) throw new Error('Consumption data unavailable')
  const latestConsumption = consumptionRows.at(-1)
  const amount = row => row.spendingWon ?? row.spending
  const districtVisits = row => isCitywide ? row.visitors : row.visits
  const periodSpending = consumptionRows.reduce((sum, row) => sum + amount(row), 0)
  const industries = [...latestConsumption.industries].sort((a, b) => amount(b) - amount(a) || a.name.localeCompare(b.name)).slice(0, 3)
  const districts = [...latestConsumption.districts].sort((a, b) => districtVisits(b) - districtVisits(a) || a.name.localeCompare(b.name)).slice(0, 3)
  const forecastRow = forecastData.forecasts.find(row => row.origin_month === forecastData.asOf && row.country_code === options.country && row.model === 'M1' && row.horizon === 1)
  if (!forecastRow) throw new Error('M1 forecast unavailable')
  const outside80 = forecastRow.forecast < forecastRow.lower_80 || forecastRow.forecast > forecastRow.upper_80
  const oneMonthValidation = forecastData.backtest.filter(row => row.model === 'M1' && row.country_code === options.country && row.horizon === 1)
  const biasPercent = summarizeBacktest(oneMonthValidation).biasPercent
  const biasDirection = biasPercent > 0 ? '높았습니다' : biasPercent < 0 ? '낮았습니다' : '같았습니다'
  const forecastBias = outside80 ? isCitywide && biasPercent !== null
    ? `${monthLabel(forecastRow.target_month)}의 점 예측은 80% 예측 범위 밖에 있습니다. 과거 1개월 뒤 검증에서 실제값이 기준 예측보다 평균 ${Math.abs(biasPercent).toFixed(1)}% ${biasDirection}.`
    : `${monthLabel(forecastRow.target_month)}의 점 예측은 80% 예측 범위 밖에 있습니다. 과거 검증의 오차 분포가 한쪽으로 치우쳐 점 예측과 범위의 중심이 다를 수 있습니다.` : null
  const selectedMarket = options.country === 'ALL' ? null : visitors.countries.find(c => c.code === options.country)
  const orderedMarkets = [...visitors.countries.filter(c => c.code !== 'ETC'), ...visitors.countries.filter(c => c.code === 'ETC')]
  const display = {
    period: `${monthLabel(options.start)} ~ ${monthLabel(options.end)}`,
    total: `${numberLabel(visitors.total)}명`, growth: rateLabel(visitors.totalGrowth),
    latest: `${monthLabel(visitors.latest.month)} ${numberLabel(visitors.latest.visitors)}명`,
    latestYoy: rateLabel(visitors.latest.yoy), latestMom: rateLabel(visitors.latest.mom),
    peak: `${monthLabel(visitors.peak.month)} ${numberLabel(visitors.peak.visitors)}명`,
    markets: (selectedMarket ? [selectedMarket] : orderedMarkets).map(c => `${c.name} ${numberLabel(c.visitors)}명 · 전체 대비 ${c.share.toFixed(1)}%`),
    regions: options.country === 'ALL' ? visitors.regions.map(r => `${r.name} ${numberLabel(r.visitors)}명 · ${r.share.toFixed(1)}%`) : [],
  }
  const supplement = {
    spendingTotal: `${monthLabel(options.start)} ~ ${monthLabel(options.end)} ${scope} 카드 소비액 합계 ${billionWonLabel(periodSpending, { compact: !isCitywide })}`,
    spendingLatest: `${monthLabel(latestConsumption.month)} ${scope} 카드 소비액 ${billionWonLabel(amount(latestConsumption), { compact: !isCitywide })}`,
    spendingPerVisitor: `${monthLabel(latestConsumption.month)} ${scope} 1인당 소비액 ${wonLabel(latestConsumption.perVisitorSpending)}`,
    industries: industries.map(row => `${monthLabel(latestConsumption.month)} ${scope} ${row.name} ${numberLabel(amount(row))}원 · 소비 비중 ${row.share.toFixed(1)}%`),
    districts: districts.map(row => `${monthLabel(latestConsumption.month)} ${scope} ${row.name} ${numberLabel(districtVisits(row))}${isCitywide ? '명' : '건'}`),
    districtNote: isCitywide ? consumptionData.districtDefinition : '구·군 방문은 중복 가능하며, 합계는 부산 전체 순방문객 수와 다를 수 있습니다.',
    m1Forecast: `${monthLabel(forecastData.asOf)} 기준 · ${monthLabel(forecastRow.target_month)} ${scope} 기준 예측(M1) ${forecastLabel(forecastRow.forecast)}`,
    m1Range80: `${monthLabel(forecastData.asOf)} 기준 · ${monthLabel(forecastRow.target_month)} ${scope} 80% 예측 범위 ${rangeLabel(forecastRow, 80)}`,
    m1Range95: `${monthLabel(forecastData.asOf)} 기준 · ${monthLabel(forecastRow.target_month)} ${scope} 95% 예측 범위 ${rangeLabel(forecastRow, 95)}`,
    ...(forecastBias ? { m1Bias: forecastBias } : {}),
  }
  let events = null
  const sources = [...visitors.sources]
  if (options.eventMonth) {
    try {
      const snapshot = await getMonth(options.eventMonth)
      const counts = monthCounts(snapshot.events, options.eventMonth)
      const peak = Math.max(0, ...counts.map(d => d.count))
      const dates = counts.filter(d => peak > 0 && d.count === peak).map(d => d.date)
      events = { available: true, month: options.eventMonth, total: snapshot.events.length, peak, dates, fetchedAt: snapshot.fetchedAt, stale: snapshot.stale, note: '날짜별 동시 진행 행사 건수이며 실제 방문객 수나 혼잡도가 아닙니다. 선택한 방문객 기간 및 국가와 별개인 부산 전체 일정입니다.' }
      display.events = `${monthLabel(options.eventMonth)} 부산 전체 등록 행사 ${events.total}건. 동시 진행 최대 ${peak}건${dates.length ? `, 날짜 ${dates.join(', ')}` : ''}. ${snapshot.stale ? '갱신 실패로 이전 자료 사용.' : '공식 일정 조회.'}`
      sources.push({ id: 'mice', label: '부산 MICE 플랫폼 · 공식 행사 일정', url: snapshot.sourceUrl, kind: 'official', fetchedAt: snapshot.fetchedAt, stale: snapshot.stale })
    } catch {
      events = { available: false, month: options.eventMonth, note: '공식 행사 일정 조회에 실패했습니다. 행사 수치는 리포트에서 제외했습니다.' }
      display.events = events.note
    }
  }
  return { visitors, consumption: { scope, rows: consumptionRows, latest: latestConsumption, periodSpending, industries, districts }, forecast: { asOf: forecastData.asOf, row: forecastRow, bias: forecastBias }, display, supplement, events, sources, country: visitors.country, focus: reportFocus[options.focus], isDemo: true }
}

export function numericSummary(evidence) {
  const { visitors: v, events: e, country } = evidence
  const d = { ...evidence.display, ...evidence.supplement }
  return {
    summary: `${d.period} ${country} 방문객의 월별 합산은 ${d.total}이며, 전년 동일 기간 대비 ${d.growth}입니다. 화면 미리보기용 예시 데이터입니다.`,
    trend: [`기간 내 최대 방문월은 ${d.peak}입니다.`, `선택 기간의 마지막 월은 ${d.latest}이며, 전년 동월 대비 ${d.latestYoy}, 전월 대비 ${d.latestMom}입니다. 단일 기간 관찰만으로 반복적인 계절성이나 변화 원인을 확정할 수 없습니다.`, `${d.spendingTotal}입니다. 마지막 달은 ${d.spendingLatest}이며, ${d.spendingPerVisitor}입니다.`, `${d.m1Forecast}입니다. ${d.m1Range80}, ${d.m1Range95}입니다. M1은 작년 같은 달 실제값을 쓰므로 증가율을 예측하지 않습니다.`],
    markets: [`${country === '전체' ? '선택 기간의 주요 시장 구성' : '선택 시장의 전체 방문객 대비 비중'}: ${d.markets.slice(0, 3).join('; ')}.`, ...(d.regions.length ? [`출발 시장 권역: ${d.regions.join('; ')}. 기타 국가는 권역 미분류로 유지합니다.`] : []), `마지막 달 주요 소비 업종: ${d.industries.join('; ')}.`, `마지막 달 주요 방문 구·군: ${d.districts.join('; ')}. ${d.districtNote}`],
    events: e ? [d.events, e.available ? e.note : '일정 조회를 다시 시도해 주세요.'] : [],
    implications: [evidence.focus === '국가별 수요 특징' ? '국가별 규모와 비중을 같은 기간으로 비교하세요. 방문 목적과 행사 참가자 국적은 현재 자료로 판단할 수 없습니다.' : evidence.focus === '정책·마케팅 시사점' ? '예시 자료의 변화만으로 예산이나 운영 인력을 결정할 수 없습니다. 실제 월별 통계와 현장 수요를 확인한 뒤 대응 시점과 우선 시장을 검토하세요.' : '실제 통계가 연동되면 전년 동월과 전월 변화를 함께 비교하고, 증가·감소 원인은 별도 근거로 확인하세요.', v.note, ...(d.m1Bias ? [d.m1Bias] : [])],
  }
}
