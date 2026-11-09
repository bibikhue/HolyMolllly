export function getRecentMonths(rows, endMonth) {
  const [year, month] = endMonth.split('-').map(Number)
  const startMonth = new Date(Date.UTC(year, month - 12, 1)).toISOString().slice(0, 7)
  return rows
    .filter(row => row.month >= startMonth && row.month <= endMonth)
    .sort((left, right) => left.month.localeCompare(right.month))
}

export function getSparklineRange(values) {
  if (!values.length) return null
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const span = maximum - minimum
  const padding = span ? span * 0.1 : Math.max(Math.abs(minimum) * 0.1, 1)
  return { min: minimum - padding, max: maximum + padding }
}

export function getLatestPeak(rows) {
  return rows.reduce((peak, row) =>
    !peak || row.value > peak.value || (row.value === peak.value && row.month > peak.month) ? row : peak, null)
}
