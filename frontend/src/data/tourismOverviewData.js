import { tourismOverviewMock } from './tourismOverviewMock.js'
import { changeRate } from './visitorDemo.js'

// The only acquisition point. Replace this function's mock return with a fetch
// to the real source, mapping it to the documented schema below. Keep the UI
// independent of the source and do not change visitorDemo.js used elsewhere.
async function acquireData({ signal } = {}) {
  signal?.throwIfAborted()
  return tourismOverviewMock
}

export function normalizeTourismOverview(raw) {
  if (!raw || typeof raw.isMock !== 'boolean' || !Array.isArray(raw.monthly) || !raw.monthly.length || !raw.visitorDefinition || !raw.districtDefinition || !raw.perVisitorDefinition) throw new Error('관광 데이터 기준을 확인할 수 없습니다.')
  const monthly = [...raw.monthly].sort((a, b) => a.month.localeCompare(b.month))
  const seen = new Set()
  for (const row of monthly) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) || seen.has(row.month) || !Number.isSafeInteger(row.visitors) || row.visitors <= 0 || !Number.isSafeInteger(row.spending) || row.spending < 0) throw new Error('월별 관광 지표를 확인할 수 없습니다.')
    seen.add(row.month)
    for (const key of ['industries', 'districts']) {
      if (!Array.isArray(row[key]) || !row[key].length || new Set(row[key].map(item => item.code || item.name)).size !== row[key].length || row[key].some(item => !item.name || !Number.isSafeInteger(item.spending) || item.spending < 0 || (key === 'districts' && (!Number.isSafeInteger(item.visitors) || item.visitors < 0)))) throw new Error('소비·지역 데이터를 확인할 수 없습니다.')
    }
    if (row.industries.reduce((sum, industry) => sum + industry.spending, 0) !== row.spending) throw new Error('업종별 소비 합계가 월 전체 소비액과 다릅니다.')
  }
  const rows = monthly.map(row => {
    const previousYear = monthly.find(item => item.month === `${Number(row.month.slice(0, 4)) - 1}${row.month.slice(4)}`)
    const [year, month] = row.month.split('-').map(Number)
    const previousMonthKey = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7)
    const previousMonth = monthly.find(item => item.month === previousMonthKey)
    const districtTotal = row.districts.reduce((sum, d) => sum + d.visitors, 0)
    const districtSpendingTotal = row.districts.reduce((sum, d) => sum + d.spending, 0)
    return {
      ...row, previousYear: previousYear?.visitors ?? null,
      yoy: changeRate(row.visitors, previousYear?.visitors), mom: changeRate(row.visitors, previousMonth?.visitors),
      spendingYoy: changeRate(row.spending, previousYear?.spending), perVisitorSpending: row.spending / row.visitors,
      industries: row.industries.map(item => ({ ...item, share: row.spending ? item.spending / row.spending * 100 : 0 })),
      districts: row.districts.map(item => ({ ...item, visitorShare: districtTotal ? item.visitors / districtTotal * 100 : 0, spendingShare: districtSpendingTotal ? item.spending / districtSpendingTotal * 100 : 0 })),
      topThreeVisitorShare: [...row.districts].sort((a, b) => b.visitors - a.visitors).slice(0, 3).reduce((sum, d) => sum + d.visitors, 0) / (districtTotal || 1) * 100,
      topThreeSpendingShare: [...row.districts].sort((a, b) => b.spending - a.spending).slice(0, 3).reduce((sum, d) => sum + d.spending, 0) / (districtSpendingTotal || 1) * 100,
    }
  })
  const selectableMonths = rows.filter(row => row.month >= raw.availableFrom).map(row => row.month)
  if (!selectableMonths.length) throw new Error('조회 가능한 월이 없습니다.')
  return { ...raw, monthly: rows, selectableMonths, asOf: selectableMonths.at(-1) }
}

export async function loadTourismOverviewData(options = {}) {
  const raw = await acquireData(options)
  options.signal?.throwIfAborted()
  return normalizeTourismOverview(raw)
}
