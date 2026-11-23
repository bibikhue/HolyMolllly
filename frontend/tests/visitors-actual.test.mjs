import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MIN_COUNTRY_VISITS, pickPerVisitLeader, summarizeVisitors, yearOverYear } from '../src/data/visitorsActualData.js'

test('FR-06 top three spending share uses the entire spending denominator', () => {
  const fixture = { asOf: '2026-08', months: ['2026-08'], districts: [['26110', '중구']], countries: ['A', 'B', 'C', '기타'], industries: ['쇼핑업'], visits: [[0, 0, 0, 100_000]], cardByCountry: [[0, 0, 0, 300], [0, 0, 1, 200], [0, 0, 2, 100], [0, 0, 3, 400]], cardByIndustry: [[0, 0, 0, 1_000]], cardTotals: [[0, 0, 1_000]], cardCountryIndustry: [] }
  assert.equal(summarizeVisitors(fixture).topThreeShare, 60)
})

test('FR-06 spending per visit ranks A above B with the same spending', () => {
  const leader = pickPerVisitLeader(new Map([[0, 100_000_000], [1, 100_000_000]]), new Map([[0, 10_000], [1, 20_000]]), ['A', 'B'], 0)
  assert.equal(leader.name, 'A')
  assert.equal(leader.perVisit, 10_000)
  assert.equal(MIN_COUNTRY_VISITS, 100_000)
})

test('spending per visit enforces the visit threshold and exclusions', () => {
  const spending = new Map([[0, 5_000_000], [1, 4_000_000], [2, 999_000_000], [3, 999_000_000]])
  const visits = new Map([[0, 100_000], [1, 99_999], [2, 100_000], [3, 100_000]])
  assert.equal(pickPerVisitLeader(spending, visits, ['A', 'B', '러시아', '기타']).name, 'A')
})

test('FR-07 year over year handles growth and a zero baseline', () => {
  assert.equal(yearOverYear(1_200, 1_000), 20)
  assert.equal(yearOverYear(1_200, 0), null)
})

test('no selected basis month uses the actual latest month and fixed source totals', () => {
  const data = JSON.parse(readFileSync(new URL('../public/data/visitors-overview.json', import.meta.url), 'utf8'))
  const latest = summarizeVisitors(data)
  assert.equal(data.asOf, '2026-08')
  assert.equal(latest.end, data.asOf)
  assert.equal(latest.start, '2025-09')
  assert.equal(latest.visitors, 4_737_273)
  assert.equal(latest.topThree.length, 3)
  assert(latest.perVisitLeader.visits >= MIN_COUNTRY_VISITS)
  assert(!['러시아', '기타'].includes(latest.perVisitLeader.name))
  const district = summarizeVisitors(data, { start: '2026-08', end: '2026-08', district: '26110' })
  assert.equal(district.start, '2026-08')
  assert.equal(district.end, '2026-08')
  assert(district.visitors > 0 && district.visitors < latest.visitors)
  assert.notEqual(district.topThreeShare, latest.topThreeShare)
})

test('2026-08 cards match the source CSV cross-checks and exclude incomplete 2026-09', () => {
  const data = JSON.parse(readFileSync(new URL('../public/data/visitors-overview.json', import.meta.url), 'utf8'))
  const latest = summarizeVisitors(data)
  assert.equal(data.months[data.telecomMonthly.at(-1)[0]], '2026-08')
  assert.equal(Math.round(latest.telecomVisitors), 2_132_942)
  assert.equal(latest.telecomYoy.toFixed(1), '56.3')
  assert.equal(latest.visitGrowthLeader.name, '중국')
  assert.equal(latest.visitGrowthLeader.increase, 629_464)
  assert.equal(latest.visitGrowthLeader.rate.toFixed(1), '130.4')
  assert.notEqual(latest.visitGrowthLeader.name, '기타')
  assert.equal(latest.topThreeShare.toFixed(1), '63.1')
  assert.equal(latest.latestCardSpend, 130_204_455_050)
  assert.equal(latest.latestCardYoy.toFixed(1), '43.8')
  assert.equal(latest.foreignShare.toFixed(1), '12.9')
  assert.equal(latest.previousForeignShare.toFixed(1), '8.5')
})

test('missing basis month inputs leave their cards without invented values', () => {
  const data = { asOf: '2026-08', months: ['2026-08'], districts: [['26110', '중구']], countries: ['기타'], industries: [], visits: [], cardByCountry: [], cardByIndustry: [], cardTotals: [], cardCountryIndustry: [], telecomMonthly: [] }
  const summary = summarizeVisitors(data)
  assert.equal(summary.telecomVisitors, null)
  assert.equal(summary.visitGrowthLeader, null)
  assert.equal(summary.latestCardSpend, null)
  assert.equal(summary.topThree.length, 0)
  assert.equal(summary.foreignShare, null)
  assert.equal(yearOverYear(10, 0), null)
})
