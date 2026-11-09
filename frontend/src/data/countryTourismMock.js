import { demoMonths } from './visitorDemo.js'
import { industryDefinitions, tourismOverviewMock } from './tourismOverviewMock.js'

// Preview data only. Visitors come directly from visitorDemo.js, and citywide
// spending and district totals come directly from tourismOverviewMock.js.
// Replace these flat rows at the acquisition boundary when source data arrives.
const districtCodes = [
  'haeundae', 'busanjin', 'jung', 'suyeong', 'dong', 'yeongdo', 'nam', 'dongnae',
  'geumjeong', 'gijang', 'buk', 'gangseo', 'sasang', 'saha', 'yeonje', 'seo',
]

export const countryDefinitions = demoMonths[0].countries.map(({ code, name, color }) => ({ code, name, color }))
export const districtDefinitions = tourismOverviewMock.monthly[0].districts.map(({ name }, index) => ({
  code: districtCodes[index], name,
}))

function allocate(total, weights) {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0)
  let allocated = 0
  return weights.map((weight, index) => {
    const amount = index === weights.length - 1 ? total - allocated : Math.round(total * weight / weightTotal)
    allocated += amount
    return amount
  })
}

const spendingPropensity = { JP: 0.87, CN: 1.13, TW: 0.94, US: 1.47, HK: 1.2, ETC: 0.78 }
const industryAffinity = {
  JP: [1.05, 1.17, 0.9, 0.89, 0.96],
  CN: [1.22, 0.91, 0.92, 0.96, 0.92],
  TW: [1.1, 1.08, 0.91, 1.04, 0.93],
  US: [0.78, 0.95, 1.23, 1.24, 1.12],
  HK: [1.12, 1.04, 1.06, 0.95, 0.89],
  ETC: [0.93, 0.98, 1.08, 1.02, 1.11],
}

// Start with different industry mixes per country, then transfer spending
// between industries inside a country until citywide industry totals match.
// Transfers preserve each country's total at single-won precision.
function allocateIndustryMatrix(countryAmounts, industryAmounts) {
  const matrix = countryAmounts.map(({ code, spendingWon }) =>
    allocate(spendingWon, industryAmounts.map((amount, index) => amount * industryAffinity[code][index])),
  )
  const differences = industryAmounts.map((amount, index) =>
    amount - matrix.reduce((sum, row) => sum + row[index], 0),
  )
  for (let receiving = 0; receiving < differences.length; receiving++) {
    while (differences[receiving] > 0) {
      const donating = differences.findIndex(value => value < 0)
      if (donating < 0) throw new Error('Industry allocation cannot be reconciled')
      const country = matrix.findIndex(row => row[donating] > 0)
      if (country < 0) throw new Error('Industry allocation has no donor')
      const amount = Math.min(differences[receiving], -differences[donating], matrix[country][donating])
      matrix[country][receiving] += amount
      matrix[country][donating] -= amount
      differences[receiving] -= amount
      differences[donating] += amount
    }
  }
  return matrix
}

export const countryVisitorRows = demoMonths.flatMap(({ month, countries }) =>
  countries.map(({ code, visitors }) => ({ month, countryCode: code, visitors })),
)

const generatedRows = tourismOverviewMock.monthly.map((city, monthIndex) => {
  const demo = demoMonths.find(row => row.month === city.month)
  const countryAmounts = allocate(city.spending, demo.countries.map(({ code, visitors }) =>
    visitors * spendingPropensity[code] * (1 + Math.sin(monthIndex * 0.41 + countryDefinitions.findIndex(item => item.code === code)) * 0.06),
  ))
  const spending = demo.countries.map(({ code }, index) => ({ code, spendingWon: countryAmounts[index] }))
  const matrix = allocateIndustryMatrix(spending, city.industries.map(item => item.spending))
  const districtVisits = city.districts.map((district, districtIndex) =>
    allocate(district.visitors, demo.countries.map(({ visitors }, countryIndex) =>
      visitors * (1 + Math.sin(districtIndex * 0.83 + countryIndex * 1.43 + monthIndex * 0.29) * 0.24),
    )),
  )
  return {
    month: city.month,
    spendingRows: spending.map(({ code, spendingWon }) => ({ month: city.month, countryCode: code, spendingWon })),
    industryRows: matrix.flatMap((amounts, countryIndex) => amounts.map((spendingWon, industryIndex) => ({
      month: city.month,
      countryCode: demo.countries[countryIndex].code,
      industryCode: industryDefinitions[industryIndex].code,
      spendingWon,
    }))),
    districtRows: districtVisits.flatMap((amounts, districtIndex) => amounts.map((visits, countryIndex) => ({
      month: city.month,
      countryCode: demo.countries[countryIndex].code,
      districtCode: districtDefinitions[districtIndex].code,
      visits,
    }))),
  }
})

// 실제 데이터 출처 확인 필요 (02번 수집 코드에 구·군 정보 포함 여부 확인)
// District visits overlap: one visitor can be counted in several districts.
export const countryTourismMock = {
  isMock: true,
  sourceLabel: tourismOverviewMock.sourceLabel,
  availableFrom: tourismOverviewMock.availableFrom,
  publicationLagMonths: tourismOverviewMock.publicationLagMonths,
  countryDefinitions,
  industryDefinitions,
  districtDefinitions,
  cityMonthlyRows: tourismOverviewMock.monthly.map(({ month, visitors, spending }) => ({ month, visitors, spendingWon: spending })),
  industryMonthlyRows: tourismOverviewMock.monthly.flatMap(({ month, industries }) =>
    industries.map(({ code, spending }) => ({ month, industryCode: code, spendingWon: spending })),
  ),
  districtMonthlyRows: tourismOverviewMock.monthly.flatMap(({ month, districts }) =>
    districts.map(({ visitors }, index) => ({ month, districtCode: districtDefinitions[index].code, visits: visitors })),
  ),
  countryVisitorRows,
  countrySpendingRows: generatedRows.flatMap(row => row.spendingRows),
  countryIndustrySpendingRows: generatedRows.flatMap(row => row.industryRows),
  countryDistrictVisitRows: generatedRows.flatMap(row => row.districtRows),
}
