import { demoMonths } from './visitorDemo.js'

// Preview-only consumption and district data. Citywide visitor counts are
// referenced unchanged from visitorDemo.js; no random generator is used.
const annualSpending = {
  2023: [27, 29, 33, 37, 39, 36, 39, 42, 41, 48, 41, 38],
  2024: [35, 37, 43, 48, 51, 46, 50, 54, 52, 62, 53, 49],
  2025: [46.8, 48.2, 55.7, 61.8, 65.4, 60.2, 65.1, 70.2, 68.5, 80.4, 68.9, 64.42],
} // billion KRW; fixed monthly amounts, independent of visitor counts.
export const industryDefinitions = [
  { code: 'shopping', name: '쇼핑', color: '#1687ca' },
  { code: 'food', name: '식음료', color: '#41b8c8' },
  { code: 'lodging', name: '숙박', color: '#7697da' },
  { code: 'leisure', name: '여가서비스', color: '#e6be72' },
  { code: 'transport', name: '교통·기타', color: '#a5bad7' },
]
const districts = [
  ['해운대구', 28.35, 22.35], ['부산진구', 24.17, 24.18], ['중구', 18.43, 17.43], ['수영구', 17.26, 12.26],
  ['동구', 12.18, 4.18], ['영도구', 11.36, 3.34], ['남구', 9.42, 3.93], ['동래구', 8.57, 2.44],
  ['금정구', 7.34, 2.08], ['기장군', 8.12, 2.91], ['북구', 6.46, 1.47], ['강서구', 6.08, 1.09],
  ['사상구', 7.03, 1.81], ['사하구', 6.79, 1.31], ['연제구', 5.27, 1.19], ['서구', 5.86, 1.06],
]

// Rounding remainder belongs to the last group, so allocations sum exactly
// to each month's total card spending, including at single-won precision.
function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0)
  let used = 0
  return weights.map((weight, index) => {
    const amount = index === weights.length - 1 ? total - used : Math.round(total * weight / sum)
    used += amount
    return amount
  })
}

export const tourismOverviewMock = {
  isMock: true,
  sourceLabel: '화면 미리보기용 예시 자료',
  availableFrom: '2024-01',
  publicationLagMonths: 2,
  visitorDefinition: '일자별 순방문자 기준으로, 2박 3일 체류 시 3명으로 집계됩니다.',
  districtDefinition: '한 사람이 여러 구·군을 방문할 수 있어 구·군별 방문객 합계는 부산 전체 방문객보다 클 수 있습니다. 지역 비중은 구·군별 방문객 집계 합계를 분모로 계산합니다.',
  perVisitorDefinition: '해당 월 외국인 카드 소비액 ÷ 해당 월 방문객 수입니다. 방문객 수는 일자별 순방문자 합산이므로, 여행자 개인의 실제 여행 총소비액을 뜻하지 않습니다.',
  monthly: demoMonths.map(row => {
    const year = Number(row.month.slice(0, 4))
    const index = Number(row.month.slice(5)) - 1
    const spending = Math.round(annualSpending[year][index] * 1_000_000_000)
    const amounts = allocate(spending, [38 + index % 3 - 2, 27, 18, 12, 5])
    const districtAmounts = allocate(spending, districts.map(([, , weight]) => weight))
    return {
      month: row.month,
      visitors: row.visitors, // Citywide baseline: never regenerate this count.
      spending,
      industries: industryDefinitions.map((industry, i) => ({ ...industry, spending: amounts[i] })),
      // District visitors intentionally overlap; DO NOT normalize their sum
      // to citywide visitors or interpret this as a partition of individuals.
      districts: districts.map(([name, weight], i) => ({ name, visitors: Math.round(row.visitors * weight / 100), spending: districtAmounts[i] })),
      // No stored per-person amount: the loader always calculates spending / visitors.
    }
  }),
}
