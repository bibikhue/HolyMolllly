import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { demoMonths } from '../src/data/visitorDemo.js'
import { buildM1Rows, empiricalQuantile, summarizeBacktest } from '../src/data/forecastM1.js'
import { loadForecastData, m1Improvement, normalizeForecastData, parseForecastCsv } from '../src/data/forecastData.js'

const m1 = buildM1Rows()
const codes = demoMonths[0].countries.map(row => row.code)

test('M1 forecasts use only the previous-year actual known at each origin', () => {
  const history = new Map(demoMonths.map(row => [row.month, row]))
  assert.equal(m1.originMonth, '2025-12')
  assert.equal(m1.forecasts.length, 12 * (codes.length + 1))
  for (const row of m1.forecasts) {
    const priorMonth = `${Number(row.target_month.slice(0, 4)) - 1}${row.target_month.slice(4)}`
    const prior = history.get(priorMonth)
    const actual = row.country_code === 'ALL' ? prior.visitors : prior.countries.find(country => country.code === row.country_code).visitors
    assert.equal(row.forecast, actual, `${row.country_code} ${row.target_month}`)
    assert(row.lower_95 <= row.lower_80 && row.lower_80 <= row.upper_80 && row.upper_80 <= row.upper_95)
  }
  assert.equal(m1.forecasts.find(row => row.country_code === 'ALL' && row.target_month === '2026-01').forecast, 230_900)
  assert.equal(m1.forecasts.find(row => row.country_code === 'JP' && row.target_month === '2026-01').forecast, 77_912)
})

test('country forecasts and rolling backtests reconcile to Busan including other countries', () => {
  for (const rows of [m1.forecasts, m1.backtest]) {
    const grouped = new Map()
    for (const row of rows) {
      const key = `${row.origin_month}|${row.target_month}|${row.horizon}|${row.model}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(row)
    }
    for (const [key, group] of grouped) {
      const all = group.find(row => row.country_code === 'ALL')
      assert.equal(group.filter(row => row.country_code !== 'ALL').length, codes.length, key)
      assert.equal(group.filter(row => row.country_code !== 'ALL').reduce((sum, row) => sum + row.forecast, 0), all.forecast, key)
      if ('actual' in all) assert.equal(group.filter(row => row.country_code !== 'ALL').reduce((sum, row) => sum + row.actual, 0), all.actual, key)
    }
  }
})

test('M1 empirical ranges, rolling counts, accuracy and bias use the same backtests', () => {
  assert.equal(empiricalQuantile([0, 10, 20, 30, 40], .10), 4)
  assert.equal(empiricalQuantile([0, 10, 20, 30, 40], .975), 39)
  const oneMonth = m1.backtest.filter(row => row.country_code === 'ALL' && row.horizon === 1)
  const yearAhead = m1.backtest.filter(row => row.country_code === 'ALL' && row.horizon === 12)
  assert.equal(oneMonth.length, 23)
  assert.equal(yearAhead.length, 12)
  assert(oneMonth.every(row => row.origin_month < row.target_month))
  const summary = summarizeBacktest(oneMonth)
  const accuracy = m1.accuracy.find(row => row.country_code === 'ALL' && row.horizon === 1)
  assert.equal(summary.n, accuracy.n)
  assert.equal(summary.mape, accuracy.mape)
  assert(Math.abs(summary.mape - 25.2032780048696) < 1e-9)
  assert(Math.abs(summary.biasPercent - 33.82467550444172) < 1e-9)
  assert.equal(accuracy.dm_pvalue_vs_m1, null)
  assert(accuracy.mase > 0)
  const january = m1.forecasts.find(row => row.country_code === 'ALL' && row.horizon === 1)
  const residuals = oneMonth.map(row => row.actual / row.forecast - 1)
  assert.equal(january.lower_80, Math.round(january.forecast * (1 + empiricalQuantile(residuals, .10))))
  assert.equal(january.upper_95, Math.round(january.forecast * (1 + empiricalQuantile(residuals, .975))))
})

test('the three deployed CSV files have the documented header and no invented model rows', async () => {
  const names = ['forecasts', 'backtest', 'accuracy']
  const csv = Object.fromEntries(names.map(kind => [kind, readFileSync(new URL(`../public/data/forecast/${kind}.csv`, import.meta.url), 'utf8')]))
  assert(names.every(kind => parseForecastCsv(csv[kind], kind).length === 0))
  const loaded = await loadForecastData({ fetchImpl: async url => ({ ok: true, text: async () => csv[url.split('/').at(-1).replace('.csv', '')] }) })
  assert.deepEqual(loaded.modelOptions, ['M1'])
  assert.equal(loaded.forecasts.length, m1.forecasts.length)
  assert.equal(loaded.sourceLabel, 'visitorDemo.js 방문객 예시 자료')
})

test('later CSV rows join M1 and improvement is based on matched validation cases', () => {
  const forecast = { ...m1.forecasts.find(row => row.country_code === 'ALL' && row.horizon === 1), model: 'M2' }
  const backtest = m1.backtest.filter(row => row.country_code === 'ALL' && row.horizon === 1).map(row => ({ ...row, model: 'M2' }))
  const accuracy = { ...m1.accuracy.find(row => row.country_code === 'ALL' && row.horizon === 1), model: 'M2', dm_pvalue_vs_m1: .5 }
  const data = normalizeForecastData({ forecasts: [forecast], backtest, accuracy: [accuracy] })
  assert(data.modelOptions.includes('M2'))
  assert.equal(m1Improvement(accuracy, data.accuracy), 0)
  assert.equal(m1Improvement({ ...accuracy, test_start: '2024-03' }, data.accuracy), null)
  assert.throws(() => normalizeForecastData({ forecasts: [{ ...forecast, lower_95: forecast.upper_95 + 1 }] }), /범위 오류/)
  assert.throws(() => normalizeForecastData({ forecasts: [{ ...forecast, lower_80: NaN }] }), /범위 오류/)
})
