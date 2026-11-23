export const MIN_COUNTRY_VISITS = 100_000
export const yearOverYear = (current, previous) => previous > 0 ? (current - previous) / previous * 100 : null
export function pickPerVisitLeader(spendingByCountry, visitsByCountry, countries, minVisits = MIN_COUNTRY_VISITS) {
  return [...spendingByCountry].map(([index, spending]) => ({ name: countries[index], visits: visitsByCountry.get(index) || 0, spending }))
    .filter(item => item.name !== '기타' && item.name !== '러시아' && item.visits >= minVisits)
    .map(item => ({ ...item, perVisit: item.spending / item.visits }))
    .sort((a, b) => b.perVisit - a.perVisit)[0] || null
}

export async function loadVisitorsActualData({ signal } = {}) {
  const response = await fetch('/data/visitors-overview.json', { signal })
  if (!response.ok) throw new Error('실제 관광 데이터를 불러오지 못했습니다.')
  const data = await response.json()
  if (data.version !== 2 || !Array.isArray(data.months) || !data.months.length || !Array.isArray(data.visits) || !Array.isArray(data.telecomMonthly)) throw new Error('관광 데이터 형식이 올바르지 않습니다.')
  return data
}

export function summarizeVisitors(data, { start, end, district = 'all' } = {}) {
  const endMonth = data.months.includes(end) ? end : data.asOf
  const endIndex = data.months.indexOf(endMonth)
  const startMonth = data.months.includes(start) && start <= endMonth ? start : data.months[Math.max(0, endIndex - 11)]
  const startIndex = data.months.indexOf(startMonth)
  const districtIndex = district === 'all' ? -1 : data.districts.findIndex(([code]) => code === district)
  const within = (m, d) => m >= startIndex && m <= endIndex && (districtIndex < 0 || d === districtIndex)
  const monthVisits = new Map()
  const countryVisits = new Map()
  for (const [m, d, c, value] of data.visits) {
    if (!within(m, d)) continue
    monthVisits.set(m, (monthVisits.get(m) || 0) + value)
    countryVisits.set(c, (countryVisits.get(c) || 0) + value)
  }
  const previousMonth = `${Number(endMonth.slice(0, 4)) - 1}${endMonth.slice(4)}`
  const previousIndex = data.months.indexOf(previousMonth)
  const telecomByMonth = new Map((data.telecomMonthly || []).map(([m, foreign, outtown, local]) => [m, { foreign, outtown, local }]))
  const telecomCurrent = telecomByMonth.get(endIndex) || null
  const telecomPrevious = telecomByMonth.get(previousIndex) || null
  const telecomYoy = telecomCurrent ? yearOverYear(telecomCurrent.foreign, telecomPrevious?.foreign) : null
  const foreignShare = row => row && row.foreign + row.outtown > 0 ? row.foreign / (row.foreign + row.outtown) * 100 : null
  const nationalVisits = new Map()
  const nationalPreviousVisits = new Map()
  let previousVisits = 0
  for (const [m, d, c, value] of data.visits) {
    if (m === endIndex) nationalVisits.set(c, (nationalVisits.get(c) || 0) + value)
    if (m === previousIndex) {
      nationalPreviousVisits.set(c, (nationalPreviousVisits.get(c) || 0) + value)
      if (districtIndex < 0 || d === districtIndex) previousVisits += value
    }
  }
  const visitGrowthLeader = previousIndex < 0 ? null : [...nationalVisits]
    .filter(([c]) => data.countries[c] !== '기타' && nationalPreviousVisits.has(c))
    .map(([c, current]) => ({ name: data.countries[c], current, previous: nationalPreviousVisits.get(c), increase: current - nationalPreviousVisits.get(c) }))
    .sort((a, b) => b.increase - a.increase)[0] || null
  const currentVisits = monthVisits.get(endIndex) || 0
  const yoy = yearOverYear(currentVisits, previousVisits)
  const countrySpending = new Map()
  let latestCardSpend = 0, previousCardSpend = 0, hasLatestCardSpend = false
  for (const [m, d, c, value] of data.cardByCountry) {
    if (within(m, d)) countrySpending.set(c, (countrySpending.get(c) || 0) + value)
    if (m === endIndex) { latestCardSpend += value; hasLatestCardSpend = true }
    if (m === previousIndex) previousCardSpend += value
  }
  const spendingTotal = [...countrySpending.values()].reduce((sum, value) => sum + value, 0)
  const rankedSpending = [...countrySpending].filter(([c]) => data.countries[c] !== '기타').sort((a, b) => b[1] - a[1])
  const topThree = rankedSpending.slice(0, 3).map(([c, value]) => ({ name: data.countries[c], spending: value }))
  const topThreeShare = spendingTotal ? topThree.reduce((sum, item) => sum + item.spending, 0) / spendingTotal * 100 : 0
  const perVisitLeader = pickPerVisitLeader(countrySpending, countryVisits, data.countries)
  const monthly = []
  for (let m = startIndex; m <= endIndex; m++) {
    const month = data.months[m]
    const prior = data.months.indexOf(`${Number(month.slice(0, 4)) - 1}${month.slice(4)}`)
    let priorVisits = 0
    if (prior >= 0) for (const [mi, d, , value] of data.visits) if (mi === prior && (districtIndex < 0 || d === districtIndex)) priorVisits += value
    monthly.push({ month, visitors: monthVisits.get(m) || 0, previousYear: prior >= 0 ? priorVisits : null, yoy: yearOverYear(monthVisits.get(m) || 0, priorVisits) })
  }
  const districtRows = data.districts.map(([code, name], d) => {
    let visitors = 0, spending = 0
    for (const [m, di, , value] of data.visits) if (m >= startIndex && m <= endIndex && d === di) visitors += value
    for (const [m, di, value] of data.cardTotals) if (m >= startIndex && m <= endIndex && d === di) spending += value
    return { code, name, visitors, spending }
  })
  const industryRows = data.industries.map((name, i) => {
    let spending = 0
    for (const [m, d, industry, value] of data.cardByIndustry) if (within(m, d) && industry === i) spending += value
    return { name, spending }
  })
  const countryIndustry = new Map()
  for (const [m, d, c, i, value] of data.cardCountryIndustry) if (within(m, d)) {
    const key = `${c}|${i}`
    countryIndustry.set(key, (countryIndustry.get(key) || 0) + value)
  }
  return { start: startMonth, end: endMonth, visitors: currentVisits, previousVisits, yoy, telecomVisitors: telecomCurrent?.foreign ?? null, telecomYoy, visitGrowthLeader: visitGrowthLeader?.increase > 0 ? { ...visitGrowthLeader, rate: yearOverYear(visitGrowthLeader.current, visitGrowthLeader.previous) } : null, topThree, topThreeShare, perVisitLeader, latestCardSpend: hasLatestCardSpend ? latestCardSpend : null, latestCardYoy: hasLatestCardSpend ? yearOverYear(latestCardSpend, previousCardSpend) : null, foreignShare: foreignShare(telecomCurrent), previousForeignShare: foreignShare(telecomPrevious), monthly, districtRows, industryRows, spendingTotal, countryIndustry }
}
