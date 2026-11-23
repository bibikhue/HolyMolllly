// UI preview data only. Coordinates are schematic positions, not real facility locations.
export const lodgingExamples = [
  { id: 'stay-haeundae', name: '해운대 바다호텔', district: '해운대구', kind: '호텔', price: '1박 예시 145,000원', address: '해운대 해변 인근 (예시)', x: 78, y: 31, rating: '4.6', subway: '해운대역 도보 약 8분' },
  { id: 'stay-gwangalli', name: '광안리 스테이', district: '수영구', kind: '게스트하우스', price: '1박 예시 68,000원', address: '광안리 해변 인근 (예시)', x: 66, y: 49, rating: '4.4', subway: '광안역 도보 약 10분' },
  { id: 'stay-seomyeon', name: '서면 시티호텔', district: '부산진구', kind: '호텔', price: '1박 예시 112,000원', address: '서면역 인근 (예시)', x: 44, y: 48, rating: '4.5', subway: '서면역 도보 약 5분' },
  { id: 'stay-nampo', name: '남포 여행자 숙소', district: '중구', kind: '게스트하우스', price: '1박 예시 59,000원', address: '남포역 인근 (예시)', x: 22, y: 68, rating: '4.3', subway: '남포역 도보 약 6분' },
  { id: 'stay-songdo', name: '송도 오션스테이', district: '서구', kind: '호텔', price: '1박 예시 98,000원', address: '송도 해변 인근 (예시)', x: 11, y: 77, rating: '4.2', subway: '자갈치역에서 버스 이용' },
  { id: 'stay-gijang', name: '기장 숲과바다', district: '기장군', kind: '리조트', price: '1박 예시 178,000원', address: '기장 해안 인근 (예시)', x: 87, y: 13, rating: '4.7', subway: '오시리아역에서 버스 이용' },
]

export const transitExamples = [
  { id: 'subway-seomyeon', name: '서면역', line: '1·2호선', type: 'subway', x: 44, y: 48 },
  { id: 'subway-nampo', name: '남포역', line: '1호선', type: 'subway', x: 22, y: 68 },
  { id: 'subway-haeundae', name: '해운대역', line: '2호선', type: 'subway', x: 78, y: 31 },
  { id: 'subway-gwangalli', name: '광안역', line: '2호선', type: 'subway', x: 66, y: 49 },
  { id: 'subway-osiria', name: '오시리아역', line: '동해선', type: 'subway', x: 87, y: 13 },
  { id: 'bus-seomyeon', name: '서면역·롯데호텔 정류장', line: '버스 정류장', type: 'bus', x: 39, y: 43 },
  { id: 'bus-gwangalli', name: '광안리해수욕장 정류장', line: '버스 정류장', type: 'bus', x: 71, y: 53 },
  { id: 'bus-songdo', name: '송도해수욕장 정류장', line: '버스 정류장', type: 'bus', x: 16, y: 79 },
  { id: 'bus-haeundae', name: '해운대해수욕장 정류장', line: '버스 정류장', type: 'bus', x: 82, y: 36 },
  { id: 'bus-gijang', name: '기장시장 정류장', line: '버스 정류장', type: 'bus', x: 83, y: 21 },
]

export const attractionExamples = [
  { id: 'sea-haeundae', name: '해운대해수욕장', district: '해운대구', themes: ['바다·해변', '가족 여행'], description: '부산의 대표 해변에서 산책과 바다 풍경을 즐길 수 있는 예시 장소입니다.', x: 78, y: 31, visitMinutes: 90 },
  { id: 'culture-gamcheon', name: '감천문화마을', district: '사하구', themes: ['문화·역사', '사진 명소'], description: '골목과 예술 작품을 둘러보는 문화 관광 예시 장소입니다.', x: 15, y: 63, visitMinutes: 100 },
  { id: 'food-jagalchi', name: '자갈치시장', district: '중구', themes: ['미식·시장', '문화·역사'], description: '부산의 시장 풍경과 지역 먹거리를 경험할 수 있는 예시 장소입니다.', x: 24, y: 70, visitMinutes: 75 },
  { id: 'nature-taejongdae', name: '태종대', district: '영도구', themes: ['자연·산책', '사진 명소'], description: '해안 경관과 산책길을 즐기는 자연 관광 예시 장소입니다.', x: 32, y: 81, visitMinutes: 120 },
  { id: 'sea-gwangalli', name: '광안리해수욕장', district: '수영구', themes: ['바다·해변', '야경'], description: '해변 산책과 야경 감상을 함께 할 수 있는 예시 장소입니다.', x: 66, y: 49, visitMinutes: 75 },
  { id: 'culture-yongdusan', name: '용두산공원', district: '중구', themes: ['문화·역사', '자연·산책'], description: '도심 공원과 주변 명소를 함께 둘러볼 수 있는 예시 장소입니다.', x: 25, y: 64, visitMinutes: 50 },
  { id: 'nature-daejeo', name: '대저생태공원', district: '강서구', themes: ['자연·산책', '가족 여행'], description: '넓은 생태 공간에서 계절 풍경을 즐길 수 있는 예시 장소입니다.', x: 20, y: 31, visitMinutes: 90 },
  { id: 'food-gijang', name: '기장 해안 먹거리 거리', district: '기장군', themes: ['미식·시장', '바다·해변'], description: '해안 풍경과 지역 음식을 함께 즐기는 예시 장소입니다.', x: 87, y: 18, visitMinutes: 90 },
]

export const routeExamples = [
  { id: 'east-coast', title: '동부산 바다 하루 코스', duration: '하루 예시', theme: '바다·해변', stops: ['해운대해수욕장', '청사포 해안 산책', '광안리해수욕장'], transport: '지하철과 버스로 이동하는 예시 경로' },
  { id: 'old-town', title: '원도심 문화 산책 코스', duration: '하루 예시', theme: '문화·역사', stops: ['감천문화마을', '자갈치시장', '용두산공원'], transport: '버스와 도보를 이용하는 예시 경로' },
  { id: 'family-day', title: '가족과 함께하는 부산 코스', duration: '1박 2일 예시', theme: '가족 여행', stops: ['대저생태공원', '해운대해수욕장', '기장 해안 먹거리 거리'], transport: '대중교통 중심의 예시 경로' },
]

export const attractionThemes = ['전체', '바다·해변', '문화·역사', '미식·시장', '자연·산책', '가족 여행', '사진 명소', '야경']
