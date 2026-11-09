import { demoMonths } from './visitorDemo.js'

export const addMonths = (month, offset) => {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7)
}

export function empiricalQuantile(values, probability) {
  if (!values.length || probability < 0 || probability > 1) return null
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * probability
  const lower = Math.floor(position)
  const fraction = position - lower
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * fraction
}

export const actualFor = (row, countryCode) => countryCode === 'ALL'
  ? row?.visitors
  : row?.countries.find(country => country.code === countryCode)?.visitors

function seasonalScale(months, byMonth, originMonth, countryCode) {
  const differences = months.filter(row => row.month <= originMonth)
    .map(row => {
      const prior = byMonth.get(addMonths(row.month, -12))
      return prior ? Math.abs(actualFor(row, countryCode) - actualFor(prior, countryCode)) : null
    }).filter(value => value !== null)
  return differences.length ? differences.reduce((sum, value) => sum + value, 0) / differences.length : null
}

export function buildM1Rows(months = demoMonths) {
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month))
  if (sorted.length < 25 || new Set(sorted.map(row => row.month)).size !== sorted.length) {
    throw new Error('M1 requires at least 25 distinct monthly observations')
  }
  const byMonth = new Map(sorted.map(row => [row.month, row]))
  const countryCodes = ['ALL', ...sorted[0].countries.map(country => country.code)]
  const originMonth = sorted.at(-1).month
  const backtest = []
  const scales = new Map()

  for (const origin of sorted.slice(12)) {
    for (const countryCode of countryCodes) {
      scales.set(`${origin.month}|${countryCode}`, seasonalScale(sorted, byMonth, origin.month, countryCode))
    }
    for (let horizon = 1; horizon <= 12; horizon++) {
      const targetMonth = addMonths(origin.month, horizon)
      const target = byMonth.get(targetMonth)
      const baseline = byMonth.get(addMonths(targetMonth, -12))
      if (!target || !baseline) continue
      for (const countryCode of countryCodes) {
        backtest.push({
          origin_month: origin.month,
          target_month: targetMonth,
          horizon,
          country_code: countryCode,
          model: 'M1',
          forecast: actualFor(baseline, countryCode),
          actual: actualFor(target, countryCode),
        })
      }
    }
  }

  const accuracy = []
  const forecasts = []
  for (const countryCode of countryCodes) {
    for (let horizon = 1; horizon <= 12; horizon++) {
      const validation = backtest.filter(row => row.country_code === countryCode && row.horizon === horizon)
      if (!validation.length) throw new Error(`M1 has no rolling validation rows for ${countryCode} h${horizon}`)
      const targets = validation.map(row => row.target_month).sort()
      const n = validation.length
      const mape = validation.reduce((sum, row) => sum + Math.abs(row.actual - row.forecast) / row.actual, 0) / n * 100
      const rmse = Math.sqrt(validation.reduce((sum, row) => sum + (row.actual - row.forecast) ** 2, 0) / n)
      const maseTerms = validation.map(row => {
        const scale = scales.get(`${row.origin_month}|${countryCode}`)
        return scale > 0 ? Math.abs(row.actual - row.forecast) / scale : null
      }).filter(value => value !== null)
      const mase = maseTerms.length === n ? maseTerms.reduce((sum, value) => sum + value, 0) / n : null
      accuracy.push({
        model: 'M1', country_code: countryCode, horizon,
        test_start: targets[0], test_end: targets.at(-1), n,
        mape, rmse, mase, dm_pvalue_vs_m1: null,
      })

      const targetMonth = addMonths(originMonth, horizon)
      const baseline = byMonth.get(addMonths(targetMonth, -12))
      if (!baseline) throw new Error(`M1 baseline is unavailable for ${targetMonth}`)
      const point = actualFor(baseline, countryCode)
      const residuals = validation.map(row => row.actual / row.forecast - 1)
      const bound = probability => Math.max(0, Math.round(point * (1 + empiricalQuantile(residuals, probability))))
      forecasts.push({
        origin_month: originMonth, target_month: targetMonth, horizon,
        country_code: countryCode, model: 'M1', forecast: point,
        lower_80: bound(.10), upper_80: bound(.90),
        lower_95: bound(.025), upper_95: bound(.975),
      })
    }
  }
  return { forecasts, backtest, accuracy, countryCodes, originMonth }
}

export function summarizeBacktest(rows) {
  if (!rows.length) return { n: 0, biasPercent: null, mape: null }
  const n = rows.length
  return {
    n,
    biasPercent: rows.reduce((sum, row) => sum + (row.actual / row.forecast - 1), 0) / n * 100,
    mape: rows.reduce((sum, row) => sum + Math.abs(row.actual - row.forecast) / row.actual, 0) / n * 100,
  }
}
