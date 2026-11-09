import http from 'node:http'
import { loadMonth } from './mice-source.mjs'
import { handleChat } from './chat-route.mjs'
import { handleReports } from './report-route.mjs'

try { process.loadEnvFile(new URL('../.env.server', import.meta.url)) } catch (error) { if (error.code !== 'ENOENT') throw error }

const port = Number(process.env.MICE_PORT || 4174)
const cache = new Map()
const pending = new Map()
const ttl = 6 * 60 * 60 * 1000
const staleLimit = 48 * 60 * 60 * 1000

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  response.end(JSON.stringify(body))
}

function validMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')) return false
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const current = Number(today.find(p => p.type === 'year').value) * 12 + Number(today.find(p => p.type === 'month').value)
  const requested = Number(month.slice(0, 4)) * 12 + Number(month.slice(5))
  return Math.abs(requested - current) <= 12
}

async function getMonth(month) {
  if (!validMonth(month)) throw new Error('Invalid month')
  const cached = cache.get(month)
  const age = cached ? Date.now() - Date.parse(cached.fetchedAt) : Infinity
  if (age < ttl) return { ...cached, stale: false }
  if (!pending.has(month)) {
    if (pending.size >= 3) throw new Error('Busy')
    const operation = loadMonth(month).then((data) => {
      cache.delete(month)
      cache.set(month, data)
      if (cache.size > 25) cache.delete(cache.keys().next().value)
      return data
    }).finally(() => pending.delete(month))
    pending.set(month, operation)
  }
  try { return { ...await pending.get(month), stale: false } }
  catch (error) {
    if (age < staleLimit) return { ...cached, stale: true }
    throw error
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  try {
    if (await handleReports(request, response, url, { getMonth, send })) return
    if (await handleChat(request, response, url, { getMonth, send })) return
  } catch { send(response, 400, { error: '요청 형식을 확인해 주세요.' }); return }
  if (request.method !== 'GET') { send(response, 405, { error: 'GET only' }); return }
  if (url.pathname === '/api/mice/health') { send(response, 200, { status: 'ok' }); return }
  if (url.pathname !== '/api/mice/month') { send(response, 404, { error: 'Not found' }); return }
  const month = url.searchParams.get('month')
  if (!validMonth(month)) { send(response, 400, { error: '조회 가능한 월은 이번 달 기준 앞뒤 12개월입니다.' }); return }
  try { send(response, 200, await getMonth(month)) }
  catch (error) {
    console.error(`MICE ${month}: ${error.message}`)
    send(response, 503, { error: '공식 일정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' })
  }
})
server.requestTimeout = 90_000
server.listen(port, '127.0.0.1', () => console.log(`MICE calendar API listening on 127.0.0.1:${port}`))
