import { demoMonths, numberLabel } from './visitorDemo.js'

const latestMonth = demoMonths.at(-1)
export const eventTrendYear = latestMonth.month.slice(0, 4)
const latestYearRows = demoMonths.filter(row => row.month.startsWith(`${eventTrendYear}-`))
const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const medianOf = values => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

export const eventTrendCountries = latestMonth.countries
  .filter(country => country.code !== 'ETC')
  .map(({ code, name, color }) => ({ code, name, color }))

export function getCountryVisitorTrend(countryCode) {
  const monthly = latestYearRows.map((row, index) => {
    const country = row.countries.find(item => item.code === countryCode)
    return { month: monthNames[index], visitors: country?.visitors ?? 0 }
  })
  const median = medianOf(monthly.map(item => item.visitors))
  return {
    median,
    monthly: monthly.map(item => {
      const ratio = median ? item.visitors / median : 1
      const level = ratio > 1.1 ? 'up' : ratio < 0.9 ? 'down' : 'usual'
      return { ...item, level, visitorsLabel: numberLabel(item.visitors) }
    }),
  }
}
