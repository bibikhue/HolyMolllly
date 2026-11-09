import { useEffect, useRef, useState } from 'react'
import { selectableMonths, monthLabel } from '../data/visitorDemo'
import { shiftMonth } from '../data/eventCalendar'
import { koreaDate } from '../data/miceEvents'
import { formatReportTime, reportSections, reportText } from '../data/reportExport'
import './AnalysisReport.css'

const countries = [['ALL','전체 국가'],['JP','일본'],['CN','중국'],['TW','대만'],['US','미국'],['HK','홍콩'],['ETC','기타']]
const focuses = [['overview','관광수요 주요 변화'],['markets','국가별 수요 특징'],['implications','정책·마케팅 시사점']]
const summarySectionTitles = { trend: '방문·소비·기준 예측', markets: '국가·업종·구·군 구성' }
const defaultOptions = { start: '2025-07', end: '2025-12', country: 'ALL', focus: 'overview', eventMonth: null }
const modeLabel = mode => mode === 'llm' ? 'LLM 요약 모드' : mode === 'summary' ? '수치 요약 모드 · LLM 연결 전' : mode === 'offline' ? '연결 확인 필요' : '연결 상태 확인 중'

function ReportIcon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name === 'spark' ? <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" /></> : name === 'download' ? <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" /></> : name === 'copy' ? <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></> : <><path d="M14 3H5v18h14V8Z" /><path d="M14 3v5h5M8 12h8M8 16h6" /></>}</svg>
}

export default function AnalysisReport({ initialFocus = 'overview' }) {
  const [options, setOptions] = useState({ ...defaultOptions, focus: focuses.some(([key]) => key === initialFocus) ? initialFocus : 'overview' })
  const [includeEvents, setIncludeEvents] = useState(false)
  const [eventMonth, setEventMonth] = useState(koreaDate().slice(0, 7))
  const [mode, setMode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const controller = useRef(null)
  const output = useRef(null)
  const copyArea = useRef(null)
  const requestOptions = { ...options, eventMonth: includeEvents ? eventMonth : null }
  const outdated = report && JSON.stringify(report.options) !== JSON.stringify(requestOptions)
  const invalid = options.start > options.end

  useEffect(() => {
    const request = new AbortController()
    fetch('/api/reports/status', { signal: request.signal }).then(async response => {
      if (!response.ok) throw new Error('Status unavailable')
      setMode((await response.json()).mode)
    }).catch(() => { if (!request.signal.aborted) setMode('offline') })
    return () => { request.abort(); controller.current?.abort() }
  }, [])

  const update = (key, value) => { setOptions(previous => ({ ...previous, [key]: value })); setCopyStatus('') }
  const generate = async () => {
    if (busy || invalid) return
    setBusy(true); setError(''); setCopyStatus('')
    controller.current = new AbortController()
    const timeout = setTimeout(() => controller.current.abort(), 145_000)
    try {
      const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestOptions), signal: controller.current.signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '리포트 생성에 실패했습니다.')
      setReport(data); setMode(data.mode)
      requestAnimationFrame(() => output.current?.focus())
    } catch (failure) {
      setError(failure.name === 'AbortError' ? '생성 시간이 길어지고 있습니다. 잠시 후 다시 시도해 주세요.' : failure.message)
    } finally { clearTimeout(timeout); setBusy(false) }
  }
  const copy = async () => {
    if (!report) return
    const text = reportText(report)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        setCopyStatus('리포트를 복사했습니다.')
        return
      } catch { /* Try the selection-based copy when clipboard permission is denied. */ }
    }
    try {
      copyArea.current.value = text
      copyArea.current.focus(); copyArea.current.select()
      if (!document.execCommand('copy')) throw new Error('Copy unavailable')
      setCopyStatus('리포트를 복사했습니다.')
    } catch { setCopyStatus('복사할 수 없습니다. 텍스트 다운로드를 이용해 주세요.') }
  }
  const download = () => {
    const blob = new Blob(['\ufeff', reportText(report)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `맙소사_분석리포트_${report.options.start}_${report.options.end}_${report.options.country}.txt`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="analysis-report"><div className="overview-container">
    <div className="overview-breadcrumb"><a href="#/">홈</a><span>›</span><span aria-current="page">분석 리포트</span></div>
    <div className="overview-title-row"><div><h1>숫자를 읽고, 흐름을 정리하다.</h1><p className="overview-subtitle">대시보드 지표를 한 편의 리포트로. 기간과 관심 시장을 선택해 요약하세요.</p></div><span className="report-mode"><i className={mode === 'llm' ? 'llm' : ''} />{modeLabel(mode)}</span></div>
    <div className="overview-demo-notice"><span>예시 자료</span><p>방문객 지표는 실제 관광 통계가 아닙니다. 행사 일정은 부산 MICE 플랫폼의 공식 자료를 별도로 조회합니다.</p></div>
    <div className="report-layout">
      <section className="report-controls" aria-labelledby="report-settings-title">
        <div className="report-settings-heading"><span><ReportIcon name="spark" /></span><div><h2 id="report-settings-title">리포트 만들기</h2><p>궁금한 범위를 정해주세요.</p></div></div>
        <form onSubmit={event => { event.preventDefault(); generate() }}>
          <fieldset disabled={busy}><legend className="visually-hidden">리포트 생성 조건</legend>
            <label>시작 월<select aria-label="시작 월" value={options.start} onChange={event => update('start', event.target.value)}>{selectableMonths.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label>
            <label>종료 월<select aria-label="종료 월" value={options.end} onChange={event => update('end', event.target.value)}>{selectableMonths.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label>
            <div className="report-presets"><button type="button" onClick={() => setOptions(previous => ({ ...previous, start: '2025-07', end: '2025-12' }))}>최근 6개월 자료</button><button type="button" onClick={() => setOptions(previous => ({ ...previous, start: '2025-01', end: '2025-12' }))}>2025년 전체</button></div>
            <label>대상 국가<select aria-label="대상 국가" value={options.country} onChange={event => update('country', event.target.value)}>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            <label>요약 관점<select aria-label="요약 관점" value={options.focus} onChange={event => update('focus', event.target.value)}>{focuses.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            <div className="report-event-option"><label><input type="checkbox" checked={includeEvents} onChange={event => { setIncludeEvents(event.target.checked); setCopyStatus('') }} />행사 일정 함께 요약</label><p>방문객 기간과 별개인 부산 전체 일정을 다룹니다.</p>{includeEvents && <label>행사 조회 월<input type="month" aria-label="행사 조회 월" value={eventMonth} min={shiftMonth(koreaDate().slice(0, 7), -12)} max={shiftMonth(koreaDate().slice(0, 7), 12)} required onChange={event => { setEventMonth(event.target.value); setCopyStatus('') }} /></label>}</div>
          </fieldset>
          {invalid && <p className="report-error" role="alert">종료 월을 시작 월 이후로 선택해 주세요.</p>}
          <button className="report-generate" type="submit" disabled={busy || invalid}><ReportIcon name="spark" />{busy ? '지표를 읽고 정리하는 중…' : report ? '리포트 다시 생성' : '자동 리포트 생성'}</button>
        </form>
        <div className="report-process"><p>리포트에 담기는 내용</p><ol><li><span>01</span>선택 기간의 방문 규모와 증감</li><li><span>02</span>주요 국가·권역의 구성</li><li><span>03</span>확인이 필요한 활용 참고사항</li></ol></div>
      </section>
      <section className="report-output" ref={output} tabIndex={-1} aria-label="생성된 분석 리포트" aria-busy={busy}>
        {error && <p className="report-error" role="alert">{error} {report ? '아래에는 이전에 생성한 리포트를 유지했습니다.' : ''}</p>}
        {busy && <div className="report-loading" role="status"><span className="report-spinner" />{includeEvents ? '방문객 지표와 공식 행사 일정을 조회하고 있습니다.' : '선택한 대시보드 수치를 요약하고 있습니다.'}</div>}
        {!report ? <div className="report-empty"><div className="report-empty-icon"><ReportIcon name="document" /></div><h2>흩어진 지표를<br />하나의 이야기로.</h2><p>기간과 국가를 선택하고 생성 버튼을 눌러주세요.<br />요약문과 함께 근거 수치, 출처를 확인할 수 있어요.</p><div><span>방문 흐름</span><span>시장 구성</span><span>활용 참고사항</span></div></div> : <>
          {outdated && <p className="report-outdated" role="status">조회 조건이 변경되었습니다. 아래 리포트는 이전 조건의 결과입니다. 다시 생성해 주세요.</p>}
          <header className="report-document-header"><div><p className="overview-eyebrow">팀 맙소사</p><h2>{report.title}</h2><p>{report.evidence.display.period} · {report.focus}</p></div><span className="report-document-mode">{report.mode === 'llm' ? 'LLM 생성' : '수치 요약'}</span></header>
          <div className="report-document-meta"><span>{formatReportTime(report.generatedAt)} · 한국 시간</span><div><button onClick={copy} disabled={busy}><ReportIcon name="copy" />복사</button><button onClick={download} disabled={busy}><ReportIcon name="download" />텍스트 다운로드</button></div></div>
          <p className="report-copy-status" role="status">{copyStatus}</p>
          <div className="report-summary"><span>한눈에 읽는 요약</span><p>{report.content.summary}</p></div>
          <div className="report-evidence-strip"><div><span>월별 합산 방문객 · 예시</span><strong>{report.evidence.display.total}</strong></div><div><span>전년 동일 기간 대비</span><strong>{report.evidence.display.growth}</strong></div><div><span>기간 내 최대 방문월</span><strong>{report.evidence.display.peak}</strong></div></div>
          <div className="report-sections">{reportSections.filter(([key]) => report.content[key].length).map(([key, title], index) => <section key={key}><span className="report-section-number">0{index + 1}</span><div><h3>{report.mode === 'summary' ? summarySectionTitles[key] || title : title}</h3>{report.content[key].map((text, i) => <p key={i}>{text}</p>)}</div></section>)}</div>
          <details className="report-evidence"><summary>요약에 사용한 근거 수치 확인</summary><dl>{Object.entries({ ...report.evidence.display, ...report.evidence.supplement }).filter(([key]) => !['period','total','growth','peak'].includes(key)).map(([key, value]) => <div key={key}><dt>{({ latest: '마지막 월 방문객', latestYoy: '전년 동월 대비', latestMom: '전월 대비', markets: '국가 구성', regions: '출발 권역', spendingTotal: '선택 기간 소비 합계', spendingLatest: '마지막 달 소비액', spendingPerVisitor: '마지막 달 1인당 소비액', industries: '업종별 소비 상위 3개', districts: '구·군 방문 상위 3곳', districtNote: '구·군 방문 집계 안내', m1Forecast: '다음 달 M1 기준 예측', m1Range80: 'M1 80% 예측 범위', m1Range95: 'M1 95% 예측 범위', m1Bias: 'M1 예측 범위 안내', events: '부산 행사 일정' })[key]}</dt><dd>{Array.isArray(value) ? value.join(' / ') : value}</dd></div>)}</dl></details>
          <div className="report-sources"><h3>데이터 기준과 출처</h3><p>{report.evidence.note}</p>{report.evidence.events && <><p>{report.evidence.events.note}</p>{report.evidence.events.fetchedAt && <p>행사 조회: {formatReportTime(report.evidence.events.fetchedAt)} · 한국 시간{report.evidence.events.stale ? ' · 이전 자료 사용' : ''}</p>}</>}{report.sources.map(source => <a key={source.id} href={source.url} target={source.url.startsWith('https://') ? '_blank' : undefined} rel={source.url.startsWith('https://') ? 'noopener noreferrer' : undefined}>{source.label} ↗</a>)}{report.mode === 'llm' && <p>LLM 요약은 근거 수치와 함께 확인해 주세요.</p>}</div>
        </>}
      </section>
    </div>
    <textarea ref={copyArea} className="visually-hidden" tabIndex={-1} aria-hidden="true" readOnly />
  </div></div>
}
