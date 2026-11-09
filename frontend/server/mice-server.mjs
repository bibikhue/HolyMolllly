import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadMonth, sourceUrl } from './mice-source.mjs'
import { handleChat } from './chat-route.mjs'
import { handleReports } from './report-route.mjs'

const ttl = 6 * 60 * 60 * 1000
const staleLimit = 7 * 24 * 60 * 60 * 1000
const storedMonthFile = /^(\d{4}-(?:0[1-9]|1[0-2]))\.json$/

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  response.end(JSON.stringify(body))
}

function validMonth(month, currentTime) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')) return false
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).formatToParts(new Date(currentTime))
  const current = Number(today.find(p => p.type === 'year').value) * 12 + Number(today.find(p => p.type === 'month').value)
  const requested = Number(month.slice(0, 4)) * 12 + Number(month.slice(5))
  return Math.abs(requested - current) <= 12
}

function validSnapshot(data, month, currentTime) {
  if (!data || data.month !== month || typeof data.fetchedAt !== 'string' || !Number.isFinite(Date.parse(data.fetchedAt))) return false
  if (Date.parse(data.fetchedAt) > currentTime + 5 * 60 * 1000) return false
  if (data.sourceUrl !== sourceUrl || typeof data.sourceName !== 'string') return false
  if (!Number.isInteger(data.sourceTotal) || data.sourceTotal < 0 || data.sourceTotal > 600) return false
  if (!Number.isInteger(data.skipped) || data.skipped < 0 || data.skipped > data.sourceTotal) return false
  if (!Array.isArray(data.events) || data.events.length > data.sourceTotal) return false
  return data.events.every((event) => event && typeof event.id === 'string' && typeof event.title === 'string' &&
    typeof event.start === 'string' && typeof event.end === 'string' && typeof event.venue === 'string' &&
    typeof event.type === 'string' && typeof event.url === 'string')
}

function errorKind(error) {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? '')
  if (/CERT_|UNABLE_TO_VERIFY|SELF_SIGNED/i.test(code) || /certificate|unable to verify/i.test(message)) return 'certificate'
  if (code === 'ETIMEDOUT' || /timed out/i.test(message)) return 'timeout'
  if (error instanceof SyntaxError || /Source (schema|pagination|changed during collection|event format|event dates|response too large)/i.test(message)) return 'source_format'
  return 'network'
}

export function createMonthCache({ fetchMonth = loadMonth, stateDirectory = process.env.STATE_DIRECTORY, now = Date.now, log = console } = {}) {
  if (stateDirectory && !isAbsolute(stateDirectory)) throw new Error('STATE_DIRECTORY must be absolute')
  const cache = new Map()
  const pending = new Map()
  const staleMonths = new Set()
  let lastSuccessAt = null
  let lastError = null
  let lastSourceOutcome = 'unknown'

  function removeStored(month) {
    if (!stateDirectory) return
    try { unlinkSync(join(stateDirectory, month + '.json')) }
    catch (error) { if (error.code !== 'ENOENT') log.warn('MICE cache cleanup failed: ' + month) }
  }

  function remember(data) {
    cache.delete(data.month)
    cache.set(data.month, data)
    while (cache.size > 25) {
      const oldest = cache.keys().next().value
      cache.delete(oldest)
      staleMonths.delete(oldest)
      removeStored(oldest)
    }
  }

  function restoreStored() {
    if (!stateDirectory) return
    let entries
    try { entries = readdirSync(stateDirectory, { withFileTypes: true }) }
    catch { log.warn('MICE cache directory unavailable'); return }
    const snapshots = []
    for (const entry of entries) {
      const match = entry.isFile() && entry.name.match(storedMonthFile)
      if (!match) continue
      try {
        const data = JSON.parse(readFileSync(join(stateDirectory, entry.name), 'utf8'))
        if (!validSnapshot(data, match[1], now())) throw new Error('invalid snapshot')
        snapshots.push(data)
      } catch {
        log.warn('MICE cache ignored: ' + entry.name)
        removeStored(match[1])
      }
    }
    snapshots.sort((a, b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt) || a.month.localeCompare(b.month))
    for (const data of snapshots) remember(data)
    if (snapshots.length) lastSuccessAt = snapshots.at(-1).fetchedAt
  }

  function persist(data) {
    if (!stateDirectory) return
    const temporary = join(stateDirectory, '.' + data.month + '.' + process.pid + '.' + randomUUID() + '.tmp')
    try {
      writeFileSync(temporary, JSON.stringify(data), { encoding: 'utf8', flag: 'wx', mode: 0o600 })
      renameSync(temporary, join(stateDirectory, data.month + '.json'))
    } catch {
      try { unlinkSync(temporary) } catch { /* file may not have been created */ }
      log.warn('MICE cache write failed: ' + data.month)
    }
  }

  restoreStored()

  async function getMonth(month) {
    if (!validMonth(month, now())) throw new Error('Invalid month')
    const cached = cache.get(month)
    const age = cached ? now() - Date.parse(cached.fetchedAt) : Infinity
    if (age < ttl) return { ...cached, stale: false }
    if (!pending.has(month)) {
      if (pending.size >= 3) throw new Error('Busy')
      const operation = Promise.resolve().then(() => fetchMonth(month)).then((data) => {
        if (!validSnapshot(data, month, now())) throw new Error('Source schema changed')
        remember(data)
        persist(data)
        lastSuccessAt = data.fetchedAt
        staleMonths.delete(month)
        lastSourceOutcome = 'ok'
        if (!staleMonths.size) lastError = null
        return data
      }).finally(() => pending.delete(month))
      pending.set(month, operation)
    }
    try { return { ...await pending.get(month), stale: false } }
    catch (error) {
      lastError = errorKind(error)
      lastSourceOutcome = 'failing'
      if (cached && age < staleLimit) {
        staleMonths.add(month)
        return { ...cached, stale: true }
      }
      staleMonths.delete(month)
      throw error
    }
  }

  function health() {
    for (const month of staleMonths) {
      const data = cache.get(month)
      if (!data || now() - Date.parse(data.fetchedAt) >= staleLimit) staleMonths.delete(month)
    }
    const source = staleMonths.size ? 'stale' : lastSourceOutcome
    if (source === 'ok') lastError = null
    return { status: 'ok', source, lastSuccessAt, staleMonths: [...staleMonths].sort(), lastError }
  }

  return { getMonth, health }
}

export function createCalendarServer(options = {}) {
  const calendar = createMonthCache(options)
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (request.method === 'GET' && url.pathname === '/api/mice/health') { send(response, 200, calendar.health()); return }
    try {
      if (await handleReports(request, response, url, { getMonth: calendar.getMonth, send })) return
      if (await handleChat(request, response, url, { getMonth: calendar.getMonth, send })) return
    } catch { send(response, 400, { error: '요청 형식을 확인해 주세요.' }); return }
    if (request.method !== 'GET') { send(response, 405, { error: 'GET only' }); return }
    if (url.pathname !== '/api/mice/month') { send(response, 404, { error: 'Not found' }); return }
    const month = url.searchParams.get('month')
    if (!validMonth(month, (options.now ?? Date.now)())) { send(response, 400, { error: '조회 가능한 월은 이번 달 기준 앞뒤 12개월입니다.' }); return }
    try { send(response, 200, await calendar.getMonth(month)) }
    catch (error) {
      console.error('MICE ' + month + ': ' + error.message)
      send(response, 503, { error: '공식 일정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' })
    }
  })
  server.requestTimeout = 90_000
  return { server, ...calendar }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.loadEnvFile(new URL('../.env.server', import.meta.url)) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const port = Number(process.env.MICE_PORT || 4174)
  const { server } = createCalendarServer()
  server.listen(port, '127.0.0.1', () => console.log('MICE calendar API listening on 127.0.0.1:' + port))
}
