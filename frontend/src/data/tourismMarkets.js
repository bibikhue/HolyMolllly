// Geographic origin of visitors; these are not districts within Busan.
const regions = [
  { code: 'EA', name: '동아시아', countries: ['JP', 'CN', 'TW', 'HK'], color: '#1687ca' },
  { code: 'NA', name: '북미', countries: ['US'], color: '#41b8c8' },
]

export function groupMarkets(countries) {
  const total = countries.reduce((sum, country) => sum + country.visitors, 0)
  const assigned = new Set(regions.flatMap((region) => region.countries))
  return [...regions.map((region) => ({ ...region, visitors: countries.filter((country) => region.countries.includes(country.code)).reduce((sum, country) => sum + country.visitors, 0) })),
    { code: 'OTHER', name: '기타·미분류', color: '#a5bad7', visitors: countries.filter((country) => !assigned.has(country.code)).reduce((sum, country) => sum + country.visitors, 0) },
  ].map((region) => ({ ...region, share: total ? region.visitors / total * 100 : 0 })).sort((a, b) => b.visitors - a.visitors)
}
