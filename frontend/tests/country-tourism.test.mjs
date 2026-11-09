import test from 'node:test'
import assert from 'node:assert/strict'
import { demoMonths } from '../src/data/visitorDemo.js'
import { tourismOverviewMock } from '../src/data/tourismOverviewMock.js'
import { countryTourismMock } from '../src/data/countryTourismMock.js'
import { loadCountryTourismData, normalizeCountryTourism } from '../src/data/countryTourismData.js'

test('the national preview preserves all existing monthly country visitors and colors', async () => {
  const data = await loadCountryTourismData()
  assert.equal(data.months.length, demoMonths.length)
  assert.equal(data.asOf, '2025-12')
  assert.equal(data.latestFullYear, 2025)
  assert.equal(data.selectableMonths[0], '2024-01')
  assert.equal(data.countryOptions.length, 5)
  for (const month of data.months) {
    const original = demoMonths.find(row => row.month === month.month)
    assert.equal(month.visitors, original.visitors)
    for (const country of month.countries) {
      const baseline = original.countries.find(row => row.code === country.code)
      assert.equal(country.visitors, baseline.visitors, `${month.month} ${country.code}`)
      assert.equal(country.color, baseline.color, `${month.month} ${country.code} color`)
    }
  }
})

test('every monthly country visitor and spending sum equals its city total', async () => {
  const data = await loadCountryTourismData()
  for (const month of data.months) {
    const overview = tourismOverviewMock.monthly.find(row => row.month === month.month)
    assert.equal(month.countries.reduce((total, row) => total + row.visitors, 0), month.visitors)
    assert.equal(month.countries.reduce((total, row) => total + row.spendingWon, 0), month.spendingWon)
    assert.equal(month.spendingWon, overview.spending)
    for (const country of month.countries) {
      assert.equal(country.perVisitorWon, country.spendingWon / country.visitors)
      assert.equal(country.visitorShare, country.visitors / month.visitors * 100)
      assert.equal(country.industries.reduce((total, row) => total + row.spendingWon, 0), country.spendingWon)
    }
  }
})

test('country by industry rows and columns reconcile to the original industry totals', async () => {
  const data = await loadCountryTourismData()
  for (const month of data.months) {
    const overview = tourismOverviewMock.monthly.find(row => row.month === month.month)
    for (const industry of overview.industries) {
      const countryTotal = month.countries.reduce((total, country) =>
        total + country.industries.find(item => item.code === industry.code).spendingWon, 0)
      assert.equal(countryTotal, industry.spending, `${month.month} ${industry.code}`)
    }
    for (const country of month.countries) {
      const rawTotal = countryTourismMock.countryIndustrySpendingRows
        .filter(row => row.month === month.month && row.countryCode === country.code)
        .reduce((total, row) => total + row.spendingWon, 0)
      assert.equal(rawTotal, country.spendingWon, `${month.month} ${country.code}`)
    }
  }
})

test('country by district visits preserve overlapping district totals', async () => {
  const data = await loadCountryTourismData()
  for (const month of data.months) {
    const overview = tourismOverviewMock.monthly.find(row => row.month === month.month)
    for (const district of overview.districts) {
      const total = month.countries.reduce((visits, country) =>
        visits + country.districts.find(item => item.name === district.name).visits, 0)
      assert.equal(total, district.visitors, `${month.month} ${district.name}`)
    }
    assert(month.countries.reduce((visits, country) =>
      visits + country.districts.reduce((total, district) => total + district.visits, 0), 0) > month.visitors)
  }
})

test('year-on-year baselines and seasonality indexes are computed from complete years', async () => {
  const data = await loadCountryTourismData()
  const latest = data.months.at(-1)
  for (const country of latest.countries) {
    const previous = data.months.find(row => row.month === '2024-12').countries.find(row => row.code === country.code)
    assert.equal(country.previousYearVisitors, previous.visitors)
    assert.equal(country.yoyPercent, (country.visitors / previous.visitors - 1) * 100)
  }
  for (const country of data.countryOptions) {
    const rows = data.seasonality.filter(row => row.code === country.code)
    assert.equal(rows.length, 12)
    assert(Math.abs(rows.reduce((total, row) => total + row.index, 0) / 12 - 100) < 1e-9)
  }
})

test('the loader rejects missing or duplicate country-month rows and broken identities', () => {
  const duplicate = structuredClone(countryTourismMock)
  duplicate.countryVisitorRows.push({ ...duplicate.countryVisitorRows[0] })
  assert.throws(() => normalizeCountryTourism(duplicate), /Duplicate country visitor/)

  const missing = structuredClone(countryTourismMock)
  missing.countryVisitorRows.pop()
  assert.throws(() => normalizeCountryTourism(missing), /missing monthly rows|Missing country visitor/)

  const visitorMismatch = structuredClone(countryTourismMock)
  visitorMismatch.countryVisitorRows[0].visitors++
  assert.throws(() => normalizeCountryTourism(visitorMismatch), /Country visitors differ/)

  const spendingMismatch = structuredClone(countryTourismMock)
  spendingMismatch.countrySpendingRows[0].spendingWon++
  assert.throws(() => normalizeCountryTourism(spendingMismatch), /Country industry total differs/)

  const industryMismatch = structuredClone(countryTourismMock)
  industryMismatch.countryIndustrySpendingRows[0].spendingWon++
  assert.throws(() => normalizeCountryTourism(industryMismatch), /Country industry total differs/)

  const cityIndustryMismatch = structuredClone(countryTourismMock)
  cityIndustryMismatch.industryMonthlyRows[0].spendingWon++
  assert.throws(() => normalizeCountryTourism(cityIndustryMismatch), /Country industry column differs/)

  const unsafe = structuredClone(countryTourismMock)
  unsafe.countrySpendingRows[0].spendingWon = Number.MAX_SAFE_INTEGER + 1
  assert.throws(() => normalizeCountryTourism(unsafe), /Invalid country spending/)
})

test('repeated loads are deterministic and aborted loads stop', async () => {
  assert.deepEqual(await loadCountryTourismData(), await loadCountryTourismData())
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(loadCountryTourismData({ signal: controller.signal }))
})
