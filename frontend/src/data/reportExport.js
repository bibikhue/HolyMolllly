export const reportSections = [
  ['trend', '방문 흐름'], ['markets', '국가·권역 구성'],
  ['events', '부산 행사 일정'], ['implications', '활용 참고사항'],
]
export function formatReportTime(value) {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
export function reportText(report, baseUrl = globalThis.location?.origin || 'http://localhost') {
  return [
    report.title, `${report.options.start} ~ ${report.options.end} | ${report.focus}`,
    `${report.mode === 'llm' ? 'LLM 생성' : '수치 요약 · LLM 연결 전'} | ${formatReportTime(report.generatedAt)} (한국 시간)`,
    '방문객 자료는 화면 미리보기용 예시 데이터이며 실제 관광 통계가 아닙니다.', '',
    '요약', report.content.summary, '',
    ...reportSections.flatMap(([key, title]) => report.content[key].length ? [title, ...report.content[key].map(item => `• ${item}`), ''] : []),
    '근거 수치', ...Object.entries(report.evidence.display).map(([key, value]) => `${({ period: '기간', total: '월별 합산 방문객', growth: '전년 동일 기간 대비', latest: '마지막 월 방문객', latestYoy: '마지막 월 전년 동월 대비', latestMom: '마지막 월 전월 대비', peak: '기간 내 최대 방문월', markets: '시장 구성', regions: '출발 권역', events: '행사 일정' })[key]}: ${Array.isArray(value) ? value.join('; ') : value}`),
    '', '데이터 기준', report.evidence.note, ...(report.evidence.events ? [report.evidence.events.note, ...(report.evidence.events.fetchedAt ? [`행사 조회: ${formatReportTime(report.evidence.events.fetchedAt)} (한국 시간)${report.evidence.events.stale ? ' · 이전 자료' : ''}`] : [])] : []),
    '', '출처', ...report.sources.map(source => `${source.label}: ${new URL(source.url, baseUrl).href}`),
  ].join('\n')
}
