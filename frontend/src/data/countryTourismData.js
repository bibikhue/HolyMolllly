import { changeRate } from './visitorDemo.js'
import { countryTourismMock } from './countryTourismMock.js'

// Replace only this acquisition function when the row-level source is ready.
async function acquireData({ signal } = {}) {
  signal?.throwIfAborted()
  return countryTourismMock
}

const validMonth = month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
const safeCount = value => Number.isSafeInteger(value) && value >= 0
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0)

function definitions(raw, key, label) {
  const rows = raw[key]
  if (!Array.isArray(rows) || !rows.length || rows.some(row => !row.code || !row.name) ||
    new Set(rows.map(row => row.code)).size !== rows.length) {
    throw new Error(`Invalid ${label} definitions`)
  }
  return rows
}

function indexedRows(raw, key, axes, valueKey, label) {
  const rows = raw[key]
  if (!Array.isArray(rows)) throw new Error(`Missing ${label} rows`)
  const indexed = new Map()
  for (const row of rows) {
    if (!validMonth(row.month) || !safeCount(row[valueKey]) ||
      axes.some(([field, allowed]) => !allowed.has(row[field]))) {
      throw new Error(`Invalid ${label} row`)
    }
    const id = [row.month, ...axes.map(([field]) => row[field])].join('|')
    if (indexed.has(id)) throw new Error(`Duplicate ${label} row: ${id}`)
    indexed.set(id, row)
  }
  return indexed
}

function required(index, label, ...parts) {
  const id = parts.join('|')
  const row = index.get(id)
  if (!row) throw new Error(`Missing ${label} row: ${id}`)
  return row
}

export function normalizeCountryTourism(raw) {
  if (!raw || typeof raw.isMock !== 'boolean' || !validMonth(raw.availableFrom)) {
    throw new Error('Invalid country tourism source')
  }
  const countries = definitions(raw, 'countryDefinitions', 'country')
  const industries = definitions(raw, 'industryDefinitions', 'industry')
  const districts = definitions(raw, 'districtDefinitions', 'district')
  if (countries.some(row => !row.color) || industries.some(row => !row.color)) {
    throw new Error('Missing chart colors')
  }
  const countryCodes = new Set(countries.map(row => row.code))
  const industryCodes = new Set(industries.map(row => row.code))
  const districtCodes = new Set(districts.map(row => row.code))
  if (!Array.isArray(raw.cityMonthlyRows) || !raw.cityMonthlyRows.length) {
    throw new Error('Missing city monthly rows')
  }
  const cityByMonth = new Map()
  for (const row of raw.cityMonthlyRows) {
    if (!validMonth(row.month) || !Number.isSafeInteger(row.visitors) || row.visitors <= 0 ||
      !safeCount(row.spendingWon) || cityByMonth.has(row.month)) {
      throw new Error('Invalid or duplicate city monthly row')
    }
    cityByMonth.set(row.month, row)
  }
  const monthKeys = [...cityByMonth.keys()].sort()
  const monthSet = new Set(monthKeys)
  const visitorIndex = indexedRows(raw, 'countryVisitorRows', [['countryCode', countryCodes]], 'visitors', 'country visitor')
  const spendingIndex = indexedRows(raw, 'countrySpendingRows', [['countryCode', countryCodes]], 'spendingWon', 'country spending')
  const industryIndex = indexedRows(raw, 'countryIndustrySpendingRows', [
    ['countryCode', countryCodes], ['industryCode', industryCodes],
  ], 'spendingWon', 'country industry spending')
  const industryTotalIndex = indexedRows(raw, 'industryMonthlyRows', [['industryCode', industryCodes]], 'spendingWon', 'city industry spending')
  const districtIndex = indexedRows(raw, 'countryDistrictVisitRows', [
    ['countryCode', countryCodes], ['districtCode', districtCodes],
  ], 'visits', 'country district visit')
  const districtTotalIndex = indexedRows(raw, 'districtMonthlyRows', [['districtCode', districtCodes]], 'visits', 'city district visit')

  const requiredSizes = [
    [visitorIndex, monthKeys.length * countries.length],
    [spendingIndex, monthKeys.length * countries.length],
    [industryIndex, monthKeys.length * countries.length * industries.length],
    [industryTotalIndex, monthKeys.length * industries.length],
    [districtIndex, monthKeys.length * countries.length * districts.length],
    [districtTotalIndex, monthKeys.length * districts.length],
  ]
  if (requiredSizes.some(([index, size]) => index.size !== size || [...index.values()].some(row => !monthSet.has(row.month)))) {
    throw new Error('Unexpected or missing monthly rows')
  }

  const months = monthKeys.map(month => {
    const city = cityByMonth.get(month)
    const countryRows = countries.map(country => {
      const visitors = required(visitorIndex, 'country visitor', month, country.code).visitors
      const spendingWon = required(spendingIndex, 'country spending', month, country.code).spendingWon
      const countryIndustries = industries.map(industry => {
        const amount = required(industryIndex, 'country industry spending', month, country.code, industry.code).spendingWon
        return {
          ...industry, spendingWon: amount, spending: amount,
          share: spendingWon ? amount / spendingWon * 100 : 0,
        }
      })
      if (sum(countryIndustries, 'spendingWon') !== spendingWon) {
        throw new Error(`Country industry total differs from country spending: ${month} ${country.code}`)
      }
      const countryDistricts = districts.map(district => {
        const visits = required(districtIndex, 'country district visit', month, country.code, district.code).visits
        return { ...district, visits, visitors: visits }
      }).sort((a, b) => b.visits - a.visits)
      return {
        ...country,
        visitors,
        spendingWon,
        spending: spendingWon,
        industries: countryIndustries,
        districts: countryDistricts,
      }
    })
    if (sum(countryRows, 'visitors') !== city.visitors) {
      throw new Error(`Country visitors differ from city total: ${month}`)
    }
    if (sum(countryRows, 'spendingWon') !== city.spendingWon) {
      throw new Error(`Country spending differs from city total: ${month}`)
    }
    for (const industry of industries) {
      const target = required(industryTotalIndex, 'city industry spending', month, industry.code).spendingWon
      const actual = countryRows.reduce((total, country) =>
        total + country.industries.find(item => item.code === industry.code).spendingWon, 0)
      if (actual !== target) throw new Error(`Country industry column differs from city industry: ${month} ${industry.code}`)
    }
    for (const district of districts) {
      const target = required(districtTotalIndex, 'city district visit', month, district.code).visits
      const actual = countryRows.reduce((total, country) =>
        total + country.districts.find(item => item.code === district.code).visits, 0)
      if (actual !== target) throw new Error(`Country district visits differ from city district: ${month} ${district.code}`)
    }
    return { month, visitors: city.visitors, spendingWon: city.spendingWon, spending: city.spendingWon, countries: countryRows }
  })

  const byMonth = new Map(months.map(row => [row.month, row]))
  const normalizedMonths = months.map(row => ({
    ...row,
    countries: row.countries.map(country => {
      const previousYearKey = `${Number(row.month.slice(0, 4)) - 1}${row.month.slice(4)}`
      const previousYearVisitors = byMonth.get(previousYearKey)?.countries.find(item => item.code === country.code).visitors ?? null
      const share = country.visitors / row.visitors * 100
      const yoyPercent = changeRate(country.visitors, previousYearVisitors)
      const perVisitorWon = country.visitors ? country.spendingWon / country.visitors : null
      return {
        ...country,
        share,
        visitorShare: share,
        previousYearVisitors,
        yoyPercent,
        visitorYoy: yoyPercent,
        perVisitorWon,
        perVisitorSpending: perVisitorWon,
      }
    }),
  }))
  const selectableMonths = monthKeys.filter(month => month >= raw.availableFrom)
  if (!selectableMonths.length) throw new Error('No selectable country tourism month')
  const latestMonth = selectableMonths.at(-1)
  const latestCountries = normalizedMonths.at(-1).countries
  const countryOptions = latestCountries.filter(row => row.code !== 'ETC')
    .sort((a, b) => b.visitors - a.visitors).map(({ code, name, color }) => ({ code, name, color }))
  const completeYears = [...new Set(monthKeys.map(month => Number(month.slice(0, 4))))]
    .filter(year => Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
      .every(month => byMonth.has(month)))
  const latestFullYear = completeYears.at(-1) ?? null
  const seasonality = latestFullYear === null ? [] : countryOptions.flatMap(country => {
    const rows = normalizedMonths.filter(row => Number(row.month.slice(0, 4)) === latestFullYear)
      .map(row => ({ month: row.month, visitors: row.countries.find(item => item.code === country.code).visitors }))
    const annualMonthlyAverage = sum(rows, 'visitors') / 12
    return rows.map(row => ({
      ...country,
      year: latestFullYear,
      month: row.month,
      monthNumber: Number(row.month.slice(5)),
      visitors: row.visitors,
      annualMonthlyAverage,
      index: annualMonthlyAverage ? row.visitors / annualMonthlyAverage * 100 : null,
    }))
  })
  return {
    isMock: raw.isMock,
    sourceLabel: raw.sourceLabel,
    publicationLagMonths: raw.publicationLagMonths,
    availableFrom: raw.availableFrom,
    asOf: latestMonth,
    latestMonth,
    latestFullYear,
    selectableMonths,
    countryOptions,
    months: normalizedMonths,
    monthly: normalizedMonths,
    seasonality,
  }
}

export async function loadCountryTourismData(options = {}) {
  const raw = await acquireData(options)
  options.signal?.throwIfAborted()
  return normalizeCountryTourism(raw)
}
