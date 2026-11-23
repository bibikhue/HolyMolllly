// 부산시 공식 행사 달력에 게시된 2026년 10~11월 축제 일정 예시.
// 실제 운영에서는 축제 공식 일정 데이터 소스로 교체한다.
const sourceUrl = 'https://www.busan.go.kr/eng/bsevents'

export const busanFestivalMock = [
  { id: 'festival-gupo-naru-2026', title: '제13회 낙동강 구포나루 축제', start: '2026-10-16', end: '2026-10-18', venue: '화명생태공원 연꽃단지', type: '부산 축제', url: sourceUrl },
  { id: 'festival-chinatown-2026', title: '부산 차이나타운 문화축제', start: '2026-10-16', end: '2026-10-18', venue: '부산역·동구 차이나타운', type: '부산 축제', url: sourceUrl },
  { id: 'festival-jeonpo-coffee-2026', title: '전포커피축제', start: '2026-10-17', end: '2026-10-18', venue: '부산진구 전포카페거리 일대', type: '부산 축제', url: sourceUrl },
  { id: 'festival-jagalchi-2026', title: '제33회 부산자갈치축제', start: '2026-10-15', end: '2026-10-18', venue: '자갈치시장', type: '부산 축제', url: sourceUrl },
  { id: 'festival-bookfair-2026', title: '광안리 해변 책문화 축제', start: '2026-10-23', end: '2026-10-28', venue: '광안리해수욕장', type: '부산 축제', url: sourceUrl },
  { id: 'festival-lalala-2026', title: '라라라 페스티벌', start: '2026-10-23', end: '2026-10-25', venue: '부산대학교역 문화행사 공간', type: '부산 축제', url: sourceUrl },
  { id: 'festival-dongnae-eupseong-2026', title: '제32회 동래읍성역사축제', start: '2026-10-16', end: '2026-10-18', venue: '동래읍성 북문·동래문화회관 일대', type: '부산 축제', url: sourceUrl },
  { id: 'festival-geumjeongsanseong-2026', title: '2026 금정산성축제', start: '2026-10-16', end: '2026-10-18', venue: '금정산성광장 일대', type: '부산 축제', url: sourceUrl },
  { id: 'festival-mackerel-2026', title: '제17회 부산고등어축제', start: '2026-10-30', end: '2026-11-01', venue: '송도해수욕장', type: '부산 축제', url: sourceUrl },
  { id: 'festival-yeongdo-bridge-2026', title: '제34회 영도다리축제', start: '2026-10-30', end: '2026-11-01', venue: '영도 아미르공원·영도대교 일대', type: '부산 축제', url: sourceUrl },
  { id: 'festival-gamcheon-2026', title: '제16회 감천문화마을 골목축제', start: '2026-10-31', end: '2026-11-01', venue: '감천문화마을', type: '부산 축제', url: sourceUrl },
  { id: 'festival-fireworks-2026', title: '제21회 부산불꽃축제', start: '2026-11-07', end: '2026-11-07', venue: '광안리해수욕장 일대', type: '부산 축제', url: sourceUrl },
]

export function festivalsForMonth(month) {
  return busanFestivalMock.filter(event => event.start.slice(0, 7) <= month && event.end.slice(0, 7) >= month)
}
