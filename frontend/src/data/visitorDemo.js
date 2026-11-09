// Synthetic values for UI preview only; these are not official tourism statistics.
const season = [0.78, 0.83, 0.96, 1.1, 1.15, 1.03, 1.09, 1.17, 1.12, 1.29, 1.08, 0.99]
const markets = [
  { name: '일본', code: 'JP', color: '#1687ca', weight: 0.31 },
  { name: '중국', code: 'CN', color: '#41b8c8', weight: 0.24 },
  { name: '대만', code: 'TW', color: '#7697da', weight: 0.16 },
  { name: '미국', code: 'US', color: '#a5bad7', weight: 0.1 },
  { name: '홍콩', code: 'HK', color: '#e6be72', weight: 0.07 },
  { name: '기타', code: 'ETC', color: '#dae4ee', weight: 0.12 },
]

export const demoMonths = [2023, 2024, 2025].flatMap((year, yi) =>
  season.map((factor, mi) => {
    const visitors = Math.round(([165000, 228000, 296000][yi] * factor * (1 + mi * 0.009)) / 100) * 100
    const weights = markets.map((market, i) => market.weight * (1 + Math.sin(mi * 0.65 + i + yi) * 0.12))
    const weightTotal = weights.reduce((sum, value) => sum + value, 0)
    let assigned = 0
    const countries = markets.map((market, i) => {
      const count = i === markets.length - 1 ? visitors - assigned : Math.round(visitors * weights[i] / weightTotal)
      assigned += count
      return { ...market, visitors: count }
    })
    return { month: `${year}-${String(mi + 1).padStart(2, '0')}`, visitors, countries }
  }),
)

export const selectableMonths = demoMonths.filter((row) => row.month >= '2024-01').map((row) => row.month)
export const monthLabel = (month) => `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`
export const numberLabel = (number) => new Intl.NumberFormat('ko-KR').format(number)
export const changeRate = (current, previous) => previous ? (current / previous - 1) * 100 : null
export const rateLabel = (rate) => rate === null ? '—' : `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`

export function getOverview(start, end) {
  const rows = demoMonths.filter((row) => row.month >= start && row.month <= end).map((row) => {
    const previousYear = demoMonths.find((item) => item.month === `${Number(row.month.slice(0, 4)) - 1}${row.month.slice(4)}`)
    const index = demoMonths.indexOf(row)
    const previousMonth = demoMonths[index - 1]
    return { ...row, previousYear: previousYear?.visitors ?? null, yoy: changeRate(row.visitors, previousYear?.visitors), mom: changeRate(row.visitors, previousMonth?.visitors) }
  })
  const total = rows.reduce((sum, row) => sum + row.visitors, 0)
  const previousTotal = rows.reduce((sum, row) => sum + (row.previousYear ?? 0), 0)
  const countries = markets.map((market) => {
    const visitors = rows.reduce((sum, row) => sum + row.countries.find((country) => country.code === market.code).visitors, 0)
    return { ...market, visitors, share: total ? visitors / total * 100 : 0 }
  }).sort((a, b) => b.visitors - a.visitors)
  const peak = rows.reduce((best, row) => !best || row.visitors > best.visitors ? row : best, null)
  return { rows, total, totalGrowth: changeRate(total, previousTotal), latest: rows.at(-1), countries, peak }
}
