import https from 'node:https'
import { rootCertificates } from 'node:tls'
import { readFileSync } from 'node:fs'

// The upstream omits its intermediate certificate. Add the CA's verified public
// intermediate to the normal root store; TLS certificate verification stays on.
const agent = new https.Agent({ keepAlive: true, ca: [...rootCertificates, readFileSync(new URL('./certs/globalsign-gcc-r6-alphassl-2025.pem', import.meta.url), 'utf8')] })
export const sourceUrl = 'https://www.busanmice.or.kr/portal/evntInfo/list.do?mid=0203000000'

function requestList(month, page) {
  const body = new URLSearchParams({ searchYr: month.slice(0, 4), searchMm: month.slice(5), mode: 'list', listPage: String(page), listEvntSeCd: '', searchSdt: '', searchEdt: '', searchTxt: '', linkInstCd: '' }).toString()
  return new Promise((resolve, reject) => {
    const request = https.request('https://www.busanmice.or.kr/portal/evntInfo/list/data.do', {
      agent, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Content-Length': Buffer.byteLength(body), Referer: sourceUrl, 'User-Agent': 'Mapsosa-Tourism-Dashboard/1.0' },
    }, (response) => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`Source returned ${response.statusCode}`)); return }
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk; if (text.length > 2_000_000) request.destroy(new Error('Source response too large')) })
      response.on('error', reject)
      response.on('end', () => {
        try {
          const data = JSON.parse(text)
          if (!Array.isArray(data.dataList) || !Number.isInteger(data.totalCnt) || data.totalCnt < 0) throw new Error('Source schema changed')
          resolve(data)
        } catch (error) { reject(error) }
      })
    })
    request.setTimeout(12_000, () => request.destroy(new Error('Source timed out')))
    request.on('error', reject)
    request.end(body)
  })
}

function plainText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
    const number = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : ''
  }).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim().slice(0, 1000)
}

export function normalizeEvent(record) {
  const dates = String(record.evntYmd ?? '').match(/\d{4}-\d{2}-\d{2}/g)
  const validDate = (date) => Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
  if (!/^\d+$/.test(String(record.idx)) || !dates?.length || !validDate(dates[0]) || !validDate(dates[1] ?? dates[0])) throw new Error('Source event format changed')
  const start = dates[0], end = dates[1] ?? dates[0]
  const title = plainText(record.evntNm)
  if (!title || start > end) throw new Error('Source event dates/title invalid')
  return { id: String(record.idx), title, start, end, venue: plainText(record.evntPlcNm) || '장소 미등록', type: plainText(record.evntSeTxt) || '기타', url: `https://www.busanmice.or.kr/portal/evntInfo/view.do?mid=0203000000&idx=${record.idx}` }
}

export async function loadMonth(month, requestPage = requestList) {
  const first = await requestPage(month, 1)
  const total = first.totalCnt
  if (total > 600 || (total > 0 && first.dataList.length === 0)) throw new Error('Source pagination limit/schema changed')
  const records = [...first.dataList]
  const pages = total === 0 ? 1 : Math.ceil(total / first.dataList.length)
  for (let page = 2; page <= pages; page++) {
    const data = await requestPage(month, page)
    if (data.totalCnt !== total || !data.dataList.length) throw new Error('Source changed during collection; retry later')
    records.push(...data.dataList)
  }
  if (records.length !== total) throw new Error('Source pagination incomplete')
  const events = [...new Map(records.map((record) => { const event = normalizeEvent(record); return [event.id, event] })).values()]
    .filter((event) => event.start.slice(0, 7) <= month && event.end.slice(0, 7) >= month)
    .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title, 'ko'))
  return { month, fetchedAt: new Date().toISOString(), sourceName: '부산 MICE 플랫폼', sourceUrl, sourceTotal: total, events }
}
