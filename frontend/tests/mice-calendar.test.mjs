import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEvent, loadMonth } from '../server/mice-source.mjs'
import { calendarDays, eventsOnDay, monthCounts, shiftMonth } from '../src/data/eventCalendar.js'

const record = (id, date = '2026-10-07 ~ 2026-10-08') => ({ idx: String(id), evntNm: '공식 &amp; 행사', evntYmd: date, evntPlcNm: '벡스코', evntSeTxt: '전시회' })

test('month collection reads every page and deduplicates source identifiers', async () => {
  const records = Array.from({ length: 25 }, (_, i) => record(i === 24 ? 1 : i + 1))
  const visited = []
  const result = await loadMonth('2026-10', async (month, page) => {
    visited.push([month, page])
    return { totalCnt: records.length, dataList: records.slice((page - 1) * 12, page * 12) }
  })
  assert.deepEqual(visited.map((entry) => entry[1]), [1, 2, 3])
  assert.equal(result.sourceTotal, 25)
  assert.equal(result.events.length, 24)
  assert.equal(result.events[0].title, '공식 & 행사')
})

test('incomplete pagination and changed source totals cannot be presented as complete', async () => {
  await assert.rejects(loadMonth('2026-10', async () => ({ totalCnt: 5, dataList: [] })))
  await assert.rejects(loadMonth('2026-10', async (_, page) => ({ totalCnt: page === 1 ? 3 : 4, dataList: [record(page)] })))
})

test('rejects invalid source IDs, reversed ranges, and impossible dates', () => {
  for (const item of [record('../1'), record(1, '2026-02-30'), record(1, '2026-10-08 ~ 2026-10-07')]) assert.throws(() => normalizeEvent(item))
})

test('calendar handles leap years and year boundaries', () => {
  assert.equal(calendarDays('2028-02').filter(Boolean).length, 29)
  assert.equal(calendarDays('2026-02').filter(Boolean).length, 28)
  assert.equal(calendarDays('2026-10')[4], '2026-10-01')
  assert.equal(shiftMonth('2026-12', 1), '2027-01')
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
})

test('cross-month events count on every active day, inclusive of the end date', () => {
  const events = [normalizeEvent(record(1, '2026-09-30 ~ 2026-10-02')), { ...normalizeEvent(record(2, '2026-10-02 ~ 2026-10-03')), type: '회의' }]
  assert.equal(eventsOnDay(events, '2026-10-02').length, 2)
  assert.equal(eventsOnDay(events, '2026-10-02', '회의').length, 1)
  assert.equal(eventsOnDay(events, '2026-10-04').length, 0)
  assert.equal(monthCounts(events, '2026-10').find(day => day.date === '2026-10-02').count, 2)
})
