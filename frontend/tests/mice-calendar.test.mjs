import test from 'node:test'
import assert from 'node:assert/strict'
import { X509Certificate } from 'node:crypto'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { sep, join, resolve } from 'node:path'
import { rootCertificates } from 'node:tls'
import { fileURLToPath } from 'node:url'
import { normalizeEvent, loadMonth, sourceUrl } from '../server/mice-source.mjs'
import { createCalendarServer, createMonthCache } from '../server/mice-server.mjs'
import { calendarDays, eventsOnDay, monthCounts, shiftMonth } from '../src/data/eventCalendar.js'

const record = (id, date = '2026-10-07 ~ 2026-10-08') => ({ idx: String(id), evntNm: '공식 &amp; 행사', evntYmd: date, evntPlcNm: '벡스코', evntSeTxt: '전시회' })
const frontendDirectory = fileURLToPath(new URL('../', import.meta.url))
const temporaryPrefix = fileURLToPath(new URL('../.tmp-mice-cache-', import.meta.url))

async function withTemporaryDirectory(run) {
  const directory = mkdtempSync(temporaryPrefix)
  try { await run(directory) }
  finally {
    assert(resolve(directory).startsWith(resolve(frontendDirectory) + sep))
    rmSync(directory, { recursive: true, force: true })
  }
}

const snapshot = (month, timestamp) => ({
  month, fetchedAt: new Date(timestamp).toISOString(), sourceName: '부산 MICE 플랫폼',
  sourceUrl, sourceTotal: 1, skipped: 0, events: [normalizeEvent(record(1, month + '-10'))],
})

test('every bundled PEM is a CA signed by a Node trusted root', () => {
  const directory = new URL('../server/certs/', import.meta.url)
  const names = readdirSync(directory).filter(name => name.endsWith('.pem'))
  assert(names.includes('globalsign-gcc-r6-alphassl-2025.pem'))
  assert(names.includes('globalsign-gcc-r46-alphassl-2025.pem'))
  const roots = rootCertificates.map(pem => new X509Certificate(pem))
  for (const name of names) {
    const cert = new X509Certificate(readFileSync(new URL(name, directory)))
    assert.equal(cert.ca, true, name)
    assert(roots.some(root => cert.checkIssued(root) && cert.verify(root.publicKey)), name)
  }
})

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

test('one malformed event is skipped but more than 20 percent fails the month', async () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = message => warnings.push(String(message))
  try {
    const records = [record(1), record(2), record(3), record(4), record(5, 'invalid')]
    const result = await loadMonth('2026-10', async () => ({ totalCnt: 5, dataList: records }))
    assert.equal(result.skipped, 1)
    assert.equal(result.events.length, 4)
    assert.match(warnings[0], /idx=5: Source event format changed/)
    assert.doesNotMatch(warnings[0], /evntNm|evntYmd/)
    records[3] = record(4, 'invalid')
    await assert.rejects(loadMonth('2026-10', async () => ({ totalCnt: 5, dataList: records })), /Source event format changed/)
  } finally { console.warn = originalWarn }
})

test('saved month survives restart as stale, expires after seven days, and ignores broken files', async () => {
  await withTemporaryDirectory(async (directory) => {
    const month = '2026-11'
    const fetchedAt = Date.parse('2026-11-10T00:00:00Z')
    let currentTime = fetchedAt
    const warnings = []
    const log = { warn: message => warnings.push(message) }
    const first = createMonthCache({ fetchMonth: async () => snapshot(month, currentTime), stateDirectory: directory, now: () => currentTime, log })
    assert.equal((await first.getMonth(month)).stale, false)
    assert.equal(first.health().source, 'ok')
    assert.equal(first.health().status, 'ok')
    assert.equal(readdirSync(directory).filter(name => name.endsWith('.json')).length, 1)
    writeFileSync(join(directory, '2026-10.json'), '{invalid json')

    currentTime += 8 * 60 * 60 * 1000
    let attempts = 0
    const restarted = createMonthCache({
      fetchMonth: async () => { attempts++; const error = new Error('unable to verify the first certificate'); error.code = 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'; throw error },
      stateDirectory: directory, now: () => currentTime, log,
    })
    assert.equal(restarted.health().source, 'unknown')
    assert.equal(restarted.health().lastSuccessAt, new Date(fetchedAt).toISOString())
    assert(warnings.some(message => message.includes('2026-10.json')))
    assert.equal(readdirSync(directory).filter(name => name.endsWith('.json')).length, 1)
    assert.equal((await restarted.getMonth(month)).stale, true)
    assert.equal(restarted.health().source, 'stale')
    assert.deepEqual(restarted.health().staleMonths, [month])
    assert.equal(restarted.health().lastError, 'certificate')
    assert.equal(attempts, 1)
    restarted.health()
    assert.equal(attempts, 1)

    currentTime = fetchedAt + 7 * 24 * 60 * 60 * 1000 + 1
    await assert.rejects(restarted.getMonth(month), /certificate/)
    assert.equal(restarted.health().status, 'ok')
    assert.equal(restarted.health().source, 'failing')
    assert.deepEqual(restarted.health().staleMonths, [])
    assert.equal(restarted.health().lastError, 'certificate')
  })
})

test('stored month files are limited to 25', async () => {
  await withTemporaryDirectory(async (directory) => {
    const currentTime = Date.parse('2026-11-10T00:00:00Z')
    for (let index = 0; index < 26; index++) {
      const month = new Date(Date.UTC(2024, index, 1)).toISOString().slice(0, 7)
      const data = { month, fetchedAt: new Date(currentTime - (26 - index) * 60_000).toISOString(), sourceName: '부산 MICE 플랫폼', sourceUrl, sourceTotal: 0, skipped: 0, events: [] }
      writeFileSync(join(directory, month + '.json'), JSON.stringify(data))
    }
    createMonthCache({ stateDirectory: directory, now: () => currentTime })
    assert.equal(readdirSync(directory).filter(name => name.endsWith('.json')).length, 25)
  })
})

test('health reports source state without contacting the upstream site', async () => {
  let currentTime = Date.parse('2026-11-10T00:00:00Z')
  let requests = 0
  let fail = false
  const month = '2026-11'
  const { server } = createCalendarServer({
    fetchMonth: async () => { requests++; if (fail) throw new Error('Source timed out'); return snapshot(month, currentTime) },
    stateDirectory: null, now: () => currentTime,
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = 'http://127.0.0.1:' + server.address().port
  try {
    const initial = await (await fetch(base + '/api/mice/health')).json()
    assert.deepEqual(initial, { status: 'ok', source: 'unknown', lastSuccessAt: null, staleMonths: [], lastError: null })
    assert.equal(requests, 0)
    assert.equal((await fetch(base + '/api/mice/month?month=' + month)).status, 200)
    const healthy = await (await fetch(base + '/api/mice/health')).json()
    assert.equal(healthy.status, 'ok')
    assert.equal(healthy.source, 'ok')
    assert.equal(healthy.lastError, null)
    assert.equal(requests, 1)
    currentTime += 8 * 60 * 60 * 1000
    fail = true
    const stale = await (await fetch(base + '/api/mice/month?month=' + month)).json()
    assert.equal(stale.stale, true)
    const degraded = await (await fetch(base + '/api/mice/health')).json()
    assert.equal(degraded.status, 'ok')
    assert.equal(degraded.source, 'stale')
    assert.equal(degraded.lastError, 'timeout')
    assert.deepEqual(degraded.staleMonths, [month])
    assert.equal(requests, 2)
  } finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
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
