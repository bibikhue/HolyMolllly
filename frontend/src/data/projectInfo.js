export const projectSections = [
  { id: 'about', label: '프로젝트 소개' },
  { id: 'scope', label: '분석 범위 안내' },
  { id: 'data', label: '데이터 출처·기준' },
]

export const projectAbout = {
  heroEyebrow: '부산 관광 인사이트',
  heroTitleLines: ['부산의 흐름을 읽다.', '관광의 내일을 보다.'],
  heroDescriptionLines: [
    '바다 너머에서 시작된 여행, 데이터로 이어지는 인사이트.',
    '부산 외국인 관광수요의 변화와 가능성을 살펴보세요.',
  ],
  heroLocation: '부산, 바다와 도시가 만나는 곳',
  heroSignature: '팀 맙소사 · 관광 데이터 분석',
  introTitleLines: ['감탄을 자아내는 인사이트,', '팀 맙소사.'],
  paragraphs: [
    '부산을 방문하는 외국인 관광객의 수요 패턴과 변화를 분석하는 데이터 분석·시각화·대시보드 개발 프로젝트입니다.',
    '방문 규모와 국가별 특성, 계절적 흐름을 살펴보고 향후 수요를 전망해 부산시 관광정책 담당자와 소상공인의 의사결정을 돕습니다.',
  ],
}

export const projectMenuGuide = [
  {
    label: '부산 관광 한눈에',
    question: '이번 달 몇 명이 와서 얼마를 썼나, 어디에 갔나',
    status: '예시 자료',
    href: '#/visitors',
  },
  {
    label: '국가별 관광',
    question: '어느 나라 손님이 많고, 돈을 많이 쓰고, 언제 오나',
    status: '예시 자료 (언어권별 관심 관광지 준비 중)',
    href: '#/countries?focus=compare',
  },
  {
    label: '관광수요 전망',
    question: '앞으로 몇 명이 올까, 예측은 얼마나 정확한가',
    status: '기준 예측(M1)만 계산, 분석팀 모형 대기',
    href: '#/outlook?focus=busan',
  },
  {
    label: '분석 리포트',
    question: '선택한 기간·국가를 한 편으로 요약',
    status: '예시 자료 기반 수치 요약',
    href: '#/reports?focus=overview',
  },
  {
    label: '부산 행사 캘린더',
    question: '부산에서 언제 어떤 행사가 열리나',
    status: '실제 자료(부산 MICE 플랫폼)',
    href: '#/events',
  },
]

export const projectScope = {
  current: [
    '부산 전체 외국인 방문객·소비',
    '국가별 비교·계절성',
    '구·군·업종별 구성',
    '기준 예측(M1)과 정확도',
  ],
  pending: [
    '실제 통계 연결(수집 후 교체 예정)',
    '분석팀 예측 모형 M2~M8 결과',
    '언어권별 관심 관광지',
    '구·군 지도',
  ],
  cautions: [
    '현재 방문객·소비 수치는 화면 미리보기용 예시 자료이며 실제 관광 통계가 아닙니다.',
    '한 사람이 여러 구·군을 방문할 수 있어 구·군별 방문객 합계는 부산 전체보다 클 수 있습니다.',
    '예측 범위는 과거 오차로 계산한 참고 범위이며 실제값의 확정 구간이 아닙니다.',
    '기준 예측(M1)은 작년 같은 달 방문객 수를 사용하며 증가율을 예측하지 않습니다.',
    '출발 국가의 권역 비교와 부산 내 구·군 비교는 기준이 다릅니다.',
  ],
}

export const projectSources = [
  {
    source: '한국관광 데이터랩',
    data: '부산 국가별 외국인 방문자, 외국인 카드 소비(업종별, 구·군별)',
    period: '2020.01~2026.08',
    usedIn: '부산 관광 한눈에, 국가별 관광, 관광수요 전망',
    status: '수집 전 · 현재 예시 자료',
  },
  {
    source: '부산관광공사',
    data: '외국인 관광객 부산 방문 동향',
    period: '2021.01~2026.07',
    usedIn: '비교 검증용',
    status: '수집 전',
  },
  {
    source: '관광지식정보시스템 외래관광객조사',
    data: '체류기간 등 관광객 특성',
    period: '2007.01~2025.12',
    usedIn: '추후 확장',
    status: '수집 전',
  },
  {
    source: '출입국·외국인정책본부',
    data: '비자별 외국인 입국자(전국)',
    period: '2006.11~2026.07',
    usedIn: '전국 참고용',
    status: '수집 전',
  },
  {
    source: '부산 MICE 플랫폼',
    data: '부산 행사 일정',
    period: '이번 달 앞뒤 12개월',
    usedIn: '부산 행사 캘린더, 자동 리포트',
    status: '실제 연결',
  },
  {
    source: '팀 맙소사 분석팀',
    data: '예측 모형 M2~M8 결과',
    period: '—',
    usedIn: '관광수요 전망',
    status: '결과 파일 양식 준비, 결과 대기',
  },
]

export const projectPrinciples = [
  '서로 다른 출처의 방문자 수는 집계 방식 확인 없이 합산하지 않습니다.',
  '전국 입국 자료는 부산 방문객의 특성으로 직접 해석하지 않습니다.',
]

export const projectTerms = [
  {
    term: '순방문자',
    description: '일자별 순방문자 기준으로, 2박 3일 체류 시 3명으로 집계됩니다.',
  },
  {
    term: '데이터 기준월',
    description: '자료가 가리키는 마지막 월입니다. 원자료는 통상 약 2개월 시차를 두고 나옵니다.',
  },
  {
    term: '1인당 소비액',
    description: '해당 월 외국인 카드 소비액 ÷ 해당 월 방문객 수입니다. 방문객 수는 일자별 순방문자 합산이므로, 여행자 개인의 실제 여행 총소비액을 뜻하지 않습니다.',
  },
  {
    term: '구·군 방문',
    description: '한 사람이 여러 구·군을 방문할 수 있어 구·군별 방문객 합계가 부산 전체보다 클 수 있습니다.',
  },
  {
    term: '전년 동월 대비',
    description: '해당 월 수치를 1년 전 같은 월과 비교한 증감률입니다.',
  },
  {
    term: '기준 예측(M1)',
    description: '작년 같은 달 실제 방문객 수를 예측값으로 쓰는 기준선입니다. 증가율은 예측하지 않습니다.',
  },
  {
    term: '80%·95% 예측 범위',
    description: '과거 예측 오차를 바탕으로 계산한 예상 범위입니다. 미래 실제값의 확정 구간은 아닙니다.',
  },
  {
    term: 'MAPE',
    description: '실제값 대비 예측값의 평균 절대 오차율입니다. 작을수록 실제값에 가깝습니다.',
  },
]

