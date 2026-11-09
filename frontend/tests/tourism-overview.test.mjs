import test from 'node:test'
import assert from 'node:assert/strict'
import { demoMonths } from '../src/data/visitorDemo.js'
import { tourismOverviewMock } from '../src/data/tourismOverviewMock.js'
import { loadTourismOverviewData, normalizeTourismOverview } from '../src/data/tourismOverviewData.js'

test('all monthly visitor baselines remain unchanged and repeated loads are deterministic', async () => {
  const first = await loadTourismOverviewData()
  const second = await loadTourismOverviewData()
  assert.deepEqual(first, second)
  assert.equal(first.asOf, '2025-12')
  for (const row of first.monthly) assert.equal(row.visitors, demoMonths.find(item => item.month === row.month).visitors)
})

test('consumption identities hold for every month at single-won precision', async () => {
  const data = await loadTourismOverviewData()
  for (const row of data.monthly) {
    assert.equal(row.perVisitorSpending, row.spending / row.visitors)
    assert.equal(row.industries.reduce((sum, item) => sum + item.spending, 0), row.spending)
    assert.equal(row.districts.reduce((sum, item) => sum + item.spending, 0), row.spending)
    assert.equal(row.districts.length, 16)
    assert(row.districts.reduce((sum, item) => sum + item.visitors, 0) > row.visitors)
    const total = row.districts.reduce((sum, item) => sum + item.visitors, 0)
    const topThree = [...row.districts].sort((a,b) => b.visitors-a.visitors).slice(0,3).reduce((sum,item)=>sum+item.visitors,0)
    assert.equal(row.topThreeVisitorShare, topThree / total * 100)
  }
  const latest = data.monthly.at(-1)
  assert.equal(latest.spending, 64_420_000_000)
  assert.equal(latest.visitors, 322_100)
  assert.equal(latest.perVisitorSpending, 200_000)
})

test('district visitors and spending have no ties in any month', async () => {
  const data = await loadTourismOverviewData()
  for (const row of data.monthly) {
    assert.equal(new Set(row.districts.map(item => item.visitors)).size, 16, `${row.month} district visitor tie`)
    assert.equal(new Set(row.districts.map(item => item.spending)).size, 16, `${row.month} district spending tie`)
    const ranked = [...row.districts].sort((a, b) => b.visitors - a.visitors)
    assert.equal(ranked[0].name, '해운대구', `${row.month} highest visitor district`)
    assert(row.topThreeVisitorShare >= 35 && row.topThreeVisitorShare <= 40, `${row.month} top-three visitor share`)
  }
})

test('loader rejects inconsistent totals instead of showing an invalid report', () => {
  const raw = structuredClone(tourismOverviewMock)
  raw.monthly[0].industries[0].spending++
  assert.throws(() => normalizeTourismOverview(raw), /業種|업종별 소비 합계/)
  const duplicates = structuredClone(tourismOverviewMock)
  duplicates.monthly.push(duplicates.monthly[0])
  assert.throws(() => normalizeTourismOverview(duplicates))
})

test('missing preceding months do not silently become the comparison baseline', () => {
  const raw = structuredClone(tourismOverviewMock)
  raw.monthly = raw.monthly.filter(row => row.month !== '2025-11')
  const data = normalizeTourismOverview(raw)
  assert.equal(data.monthly.find(row => row.month === '2025-12').mom, null)
  assert.notEqual(data.monthly.find(row => row.month === '2025-12').yoy, null)
})

test('cancellation and source definitions are honored', async () => {
  const controller = new AbortController(); controller.abort()
  await assert.rejects(loadTourismOverviewData({ signal: controller.signal }))
  assert.match(tourismOverviewMock.visitorDefinition, /2박 3일/)
  assert.match(tourismOverviewMock.districtDefinition, /전체 방문객보다 클 수/)
})
