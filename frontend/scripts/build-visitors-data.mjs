import { createReadStream, mkdirSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const source = name => path.join(root, 'sources', 'results', `${name}.csv`)
const output = path.join(root, 'frontend', 'public', 'data', 'visitors-overview.json')
const telecomSource = path.join(root, 'sources', 'results', '봉진 데이터', '원 데이터', '부산방문자_통신_월별.csv')
const normalizeCountry = name => name === '오스트레일리아' ? '호주' : name
const amount = (value, factor = 1) => Math.round(Number(value) * factor)
const raw = { visits: [], cardByCountry: [], cardByIndustry: [], cardTotals: [], cardCountryIndustry: [] }
const districtNames = new Map()
const countries = new Set()
const industries = new Set()
const months = new Set()
const districts = new Set()

async function eachRow(name, handle, filename = source(name)) {
  const lines = createInterface({ input: createReadStream(filename, { encoding: 'utf8' }), crlfDelay: Infinity })
  let headers
  for await (const line of lines) {
    if (!headers) { headers = line.replace(/^\uFEFF/, '').split(','); continue }
    if (!line) continue
    const fields = line.split(',')
    if (fields.length !== headers.length) throw new Error(`${name}: CSV 열 수가 다릅니다.`)
    const row = Object.fromEntries(headers.map((header, index) => [header, fields[index]]))
    handle(row)
  }
}

function track(row, country) {
  months.add(row.YEAR_MONTH)
  districts.add(row.SGG_CD)
  if (country) countries.add(country)
}

await eachRow('국가별외국인방문객현황', row => {
  const country = normalizeCountry(row.REGN_NM)
  track(row, country)
  raw.visits.push([row.YEAR_MONTH, row.SGG_CD, country, amount(row.TOU_NUM)])
})
await eachRow('국가별관광소비', row => {
  const country = normalizeCountry(row.DPTR_REGN_DTL_NM)
  track(row, country)
  raw.cardByCountry.push([row.YEAR_MONTH, row.SGG_CD, country, amount(row.DTL_TOU_NUM)])
})
await eachRow('업종별관광소비', row => {
  track(row)
  if (row.DPTR_REGN_NM === '전체') raw.cardTotals.push([row.YEAR_MONTH, row.SGG_CD, amount(row.TOU_NUM, 1000)])
  else {
    industries.add(row.DPTR_REGN_NM)
    raw.cardByIndustry.push([row.YEAR_MONTH, row.SGG_CD, row.DPTR_REGN_NM, amount(row.TOU_NUM, 1000)])
  }
})
const detailed = new Map()
await eachRow('외국인_업종_국적별_관광소비_및_방문', row => {
  const country = normalizeCountry(row.CUST_SIDO_NM)
  track(row, country)
  industries.add(row.DPTR_REGN_NM)
  districtNames.set(row.SGG_CD, row.SIDO_NM.replace(/^부산광역시\s*/, ''))
  const key = [row.YEAR_MONTH, row.SGG_CD, country, row.DPTR_REGN_NM].join('|')
  detailed.set(key, (detailed.get(key) || 0) + Number(row.DTL_TOU_NUM))
})
raw.cardCountryIndustry = [...detailed].map(([key, value]) => [...key.split('|'), amount(value, 1000)])
const telecomRaw = []
await eachRow('부산방문자_통신_월별', row => {
  const [year, month] = row.date.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) throw new Error(`통신 자료의 월이 올바르지 않습니다: ${row.date}`)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (Number(row.n_days) < daysInMonth || row['외국인(c)'] === '') return
  const foreign = Number(row['외국인(c)'])
  const outtown = Number(row['외지인(b)'])
  const local = Number(row['현지인(a)'])
  if (![foreign, outtown, local].every(Number.isFinite)) throw new Error(`통신 자료 값이 올바르지 않습니다: ${row.date}`)
  telecomRaw.push([row.date, foreign, outtown, local])
}, telecomSource)

const monthList = [...months].sort()
const districtList = [...districts].sort().map(code => [code, districtNames.get(code) || code])
const countryList = [...countries].sort()
const industryList = [...industries].sort()
const indexes = lists => lists.map(list => new Map(list.map((key, index) => [Array.isArray(key) ? key[0] : key, index])))
const [monthIndex, districtIndex, countryIndex, industryIndex] = indexes([monthList, districtList, countryList, industryList])
const compact = (rows, categoryIndex) => rows.map(([month, district, category, value]) => [monthIndex.get(month), districtIndex.get(district), categoryIndex.get(category), value])
const visits = compact(raw.visits, countryIndex)
const cardByCountry = compact(raw.cardByCountry, countryIndex)
const cardByIndustry = compact(raw.cardByIndustry, industryIndex)
const cardTotals = raw.cardTotals.map(([month, district, value]) => [monthIndex.get(month), districtIndex.get(district), value])
const cardCountryIndustry = raw.cardCountryIndustry.map(([month, district, country, industry, value]) => [monthIndex.get(month), districtIndex.get(district), countryIndex.get(country), industryIndex.get(industry), value])
const telecomMonthly = telecomRaw.filter(([month]) => monthIndex.has(month)).map(([month, foreign, outtown, local]) => [monthIndex.get(month), foreign, outtown, local])

const totals = new Map(cardTotals.map(([month, district, value]) => [`${month}|${district}`, value]))
const sums = new Map()
for (const [month, district, , value] of cardByIndustry) {
  const key = `${month}|${district}`
  sums.set(key, (sums.get(key) || 0) + value)
}
for (const [key, total] of totals) {
  if (Math.abs((sums.get(key) || 0) - total) > Math.max(1, total * 0.0001)) throw new Error(`업종 합계 차이가 0.01%를 넘습니다: ${key}`)
}
const monthlyCountry = new Map()
const monthlyDetail = new Map()
for (const [month, , country, value] of cardByCountry) {
  if (country === countryIndex.get('기타')) continue
  monthlyCountry.set(month, (monthlyCountry.get(month) || 0) + value)
}
for (const [month, , , , value] of cardCountryIndustry) monthlyDetail.set(month, (monthlyDetail.get(month) || 0) + value)
for (const [month, total] of monthlyCountry) {
  if (Math.abs((monthlyDetail.get(month) || 0) - total) > Math.max(1, total * 0.0001)) throw new Error(`국가별 카드 소비와 상세 자료 차이가 0.01%를 넘습니다: ${monthList[month]}`)
}
const asOf = monthList[Math.max(...visits.map(row => row[0]))]
const data = { version: 2, source: '한국관광 데이터랩', asOf, months: monthList, districts: districtList, countries: countryList, industries: industryList, visits, cardByCountry, cardByIndustry, cardTotals, cardCountryIndustry, telecomMonthly }
mkdirSync(path.dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(data))
console.log(`생성: ${output} (${Buffer.byteLength(JSON.stringify(data))} bytes)`)
