import { PATHS } from "./paths";

export const FOOTER_LIST = [
  { name: "FAQ", link: PATHS.FAQ },
  { name: "프로젝트 소개", link: PATHS.ABOUT },
  { name: "분석 범위 안내", link: PATHS.ANALYSIS_SCOPE },
  { name: "데이터 출처·기준", link: PATHS.DATA_SOURCES },
];

export const RELATED_SITES = [
  {
    name: "한국관광 데이터랩",
    link: "https://datalab.visitkorea.or.kr/datalab/portal/main/getMainForm.do",
  },
  { name: "관광지식정보시스템", link: "https://www.tour.go.kr/" },
  { name: "비짓부산", link: "https://www.visitbusan.net/" },
  { name: "부산광역시 홈페이지", link: "https://www.busan.go.kr/index" },
];

export const HEADER_LIST = [
  {
    name: "관광 정책 지원",
    link: PATHS.ADMIN,
    children: [
      { name: "국가별 방문 및 소비", link: PATHS.ADMIN_COUNTRIES },
      { name: "분석 리포트", link: PATHS.ADMIN_REPORT },
      {
        name: "국가별 예상 관광객 수\n(시뮬레이션)",
        link: PATHS.ADMIN_FORECAST,
      },
    ],
  },
  {
    name: "상권 분석 지원",
    link: PATHS.OWNERS,
    children: [
      { name: "방문 및 소비 패턴 분석", link: PATHS.OWNERS_PATTERNS },
      { name: "주간 행사 알림", link: PATHS.OWNERS_WEEKLY_EVENTS },
    ],
  },
  {
    name: "관광 안내",
    link: PATHS.VISITORS,
    children: [
      { name: "교통이 편리한 숙박시설", link: PATHS.VISITORS_STAYS },
      { name: "관광지 및 체험형 시설", link: PATHS.VISITORS_ATTRACTIONS },
      { name: "추천 코스", link: PATHS.VISITORS_RECOMMENDED_COURSES },
    ],
  },
  { name: "통합 캘린더", link: PATHS.CALENDAR },
];
