import { numberLabel } from './visitorDemo.js'

export const billionWonNumber = value => (value / 100_000_000).toFixed(1)

export const billionWonLabel = (value, { compact = false } = {}) =>
  `${billionWonNumber(value)}억${compact ? '' : ' '}원`

export const wonNumber = value => numberLabel(Math.round(value))

export const wonLabel = value => `${wonNumber(value)}원`

export const forecastLabel = value => `${numberLabel(Math.round(value / 1000) * 1000)}명`

export const rangeLabel = (row, level) => {
  const lower = forecastLabel(row[`lower_${level}`])
  const upper = forecastLabel(row[`upper_${level}`])
  return lower === upper ? `약 ${lower}` : `${lower}~${upper}`
}
