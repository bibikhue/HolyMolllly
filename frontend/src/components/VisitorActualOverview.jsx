import { useEffect, useState } from 'react'
import { loadVisitorsActualData, summarizeVisitors } from '../data/visitorsActualData'
import './VisitorActualOverview.css'

const monthLabel = month => `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`
const numberLabel = value => Math.round(value).toLocaleString('ko-KR')
const percentLabel = value => value === null ? '-' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
const changeLabel = value => value === null ? '-' : `${value < 0 ? '▼ ' : value > 0 ? '▲ ' : ''}${percentLabel(value)}`
const sections = ['kpi', 'trend', 'region', 'industry']

function VisitChart({ rows }) {
  const width = 760, height = 245, left = 64, right = 18, top = 18, bottom = 35
  const max = Math.max(1, ...rows.map(row => row.visitors)) * 1.1
  const x = index => left + index * (width - left - right) / Math.max(1, rows.length - 1)
  const y = value => height - bottom - value / max * (height - top - bottom)
  const points = rows.map((row, index) => `${x(index)},${y(row.visitors)}`).join(' ')
  return <svg className="actual-trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${monthLabel(rows[0].month)}부터 ${monthLabel(rows.at(-1).month)}까지 구·군별 방문 건수 추이`}>
    {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1={left} x2={width - right} y1={y(max * tick / 4)} y2={y(max * tick / 4)} stroke="#e4ebf0" /><text x={left - 10} y={y(max * tick / 4) + 4} textAnchor="end">{numberLabel(max * tick / 4)}</text></g>)}
    <polyline points={points} fill="none" stroke="#0068a9" strokeWidth="3" strokeLinejoin="round" />
    {rows.map((row, index) => <g key={row.month}><circle cx={x(index)} cy={y(row.visitors)} r="4" fill="#fff" stroke="#0068a9" strokeWidth="2"><title>{monthLabel(row.month)}: {numberLabel(row.visitors)}건</title></circle>{(index % Math.ceil(rows.length / 6) === 0 || index === rows.length - 1) && <text x={x(index)} y={height - 8} textAnchor="middle">{row.month.slice(2).replace('-', '.')}</text>}</g>)}
  </svg>
}

export default function VisitorActualOverview({ focus = 'kpi', navigationKey, onDataStatus }) {
  const [state, setState] = useState({ data: null, error: null })
  const [retry, setRetry] = useState(0)
  const [period, setPeriod] = useState({ start: '', end: '' })
  const [district, setDistrict] = useState('all')
  const [country, setCountry] = useState('all')
  useEffect(() => {
    const controller = new AbortController()
    loadVisitorsActualData({ signal: controller.signal }).then(data => {
      setState({ data, error: null })
      onDataStatus?.({ isMock: false, asOf: data.asOf })
    }).catch(error => { if (!controller.signal.aborted) setState({ data: null, error: error.message }) })
    return () => controller.abort()
  }, [retry, onDataStatus])
  useEffect(() => {
    if (!state.data) return undefined
    const target = document.getElementById(`visitor-${sections.includes(focus) ? focus : 'kpi'}`)
    const frame = requestAnimationFrame(() => { target?.scrollIntoView({ block: 'start', behavior: 'instant' }); target?.focus({ preventScroll: true }) })
    return () => cancelAnimationFrame(frame)
  }, [focus, navigationKey, state.data])

  const data = state.data
  if (!data) return <div className="visitor-overview actual-overview"><div className="actual-container"><h1>부산 관광 한눈에</h1><p role={state.error ? 'alert' : 'status'}>{state.error || '실제 데이터를 불러오고 있습니다.'}</p>{state.error && <button onClick={() => setRetry(value => value + 1)}>다시 시도</button>}</div></div>
  const available = data.months.filter(month => month >= '2020-01' && month <= data.asOf)
  const summary = summarizeVisitors(data, { ...period, district })
  const selectedDistrict = district === 'all' ? '부산 16개 구·군 합계' : data.districts.find(([code]) => code === district)?.[1]
  const districtRows = district === 'all' ? summary.districtRows : summary.districtRows.filter(row => row.code === district)
  const countryIndex = data.countries.indexOf(country)
  const industryRows = country === 'all' ? summary.industryRows : summary.industryRows.map((row, index) => ({ ...row, spending: summary.countryIndustry.get(`${countryIndex}|${index}`) || 0 }))
  const industryMax = Math.max(1, ...industryRows.map(row => row.spending))
  return <div className="visitor-overview actual-overview"><div className="actual-container">
    <nav className="overview-breadcrumb" aria-label="현재 위치"><a href="#/">홈</a><span aria-hidden="true">›</span><span aria-current="page">부산 관광 한눈에</span></nav>
    <header className="actual-heading"><div className="actual-heading-line"><h1>부산 관광 한눈에</h1><span>{monthLabel(summary.end)} 기준</span></div><p>한국관광 데이터랩 · 구·군 방문 합계는 같은 사람의 중복 방문을 포함합니다.</p></header>
    <section className="actual-filters" aria-label="조회 조건">
      <label>시작 월<select aria-label="시작 월" value={summary.start} onChange={event => setPeriod({ start: event.target.value, end: event.target.value > summary.end ? event.target.value : summary.end })}>{available.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label>
      <label>종료 월<select aria-label="종료 월" value={summary.end} onChange={event => setPeriod({ start: event.target.value < summary.start ? event.target.value : summary.start, end: event.target.value })}>{available.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label>
      <label>구·군<select aria-label="구·군" value={district} onChange={event => setDistrict(event.target.value)}><option value="all">부산 전체(구·군 합계)</option>{data.districts.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <button type="button" onClick={() => { setPeriod({ start: '', end: '' }); setDistrict('all'); setCountry('all') }}>초기화</button>
    </section>
    <section id="visitor-kpi" className="actual-section" tabIndex={-1} aria-labelledby="visitor-kpi-title"><h2 id="visitor-kpi-title">핵심 지표 요약</h2><div className="actual-kpis">
      <article className="actual-kpi"><span>부산 외국인 방문자</span><strong>{summary.telecomVisitors === null ? '-' : numberLabel(summary.telecomVisitors)}<small>{summary.telecomVisitors === null ? '' : '명'}</small></strong><p className="actual-kpi-support">{summary.telecomVisitors === null ? '자료 없음' : <>전년 동월 대비 <span className={summary.telecomYoy < 0 ? 'actual-down' : 'actual-up'}>{changeLabel(summary.telecomYoy)}</span></>}</p><p>통신 기준 · 부산 전체 · 일별 방문자 합(2박 3일 = 3)</p></article>
      <article className="actual-kpi"><span>방문 증가 1위 국가</span><strong>{summary.visitGrowthLeader?.name || '-'}</strong><p className="actual-kpi-support">{summary.visitGrowthLeader ? `+${(summary.visitGrowthLeader.increase / 10000).toFixed(1)}만 건, ${percentLabel(summary.visitGrowthLeader.rate)}` : '자료 없음'}</p><p>구·군별 방문 합계 기준 · 부산 전체</p></article>
      <article className="actual-kpi"><span>소비 상위 3개국 비중</span><strong>{summary.spendingTotal ? summary.topThreeShare.toFixed(1) : '-'}<small>{summary.spendingTotal ? '%' : ''}</small></strong><p className="actual-kpi-support">{summary.spendingTotal ? summary.topThree.map(item => item.name).join(' · ') : '자료 없음'}</p><p>선택 기간 · 카드 결제 기준</p></article>
      <article className="actual-kpi"><span>최근 월 외국인 카드 소비액</span><strong>{summary.latestCardSpend === null ? '-' : numberLabel(summary.latestCardSpend / 100000000)}<small>{summary.latestCardSpend === null ? '' : '억 원'}</small></strong><p className="actual-kpi-support">{summary.latestCardSpend === null ? '자료 없음' : <>전년 동월 대비 <span className={summary.latestCardYoy < 0 ? 'actual-down' : 'actual-up'}>{changeLabel(summary.latestCardYoy)}</span></>}</p><p>{summary.foreignShare === null ? '외국인 비중 자료 없음' : `부산 방문자 중 외국인 ${summary.foreignShare.toFixed(1)}%(전년 ${summary.previousForeignShare === null ? '-' : `${summary.previousForeignShare.toFixed(1)}%`})`} · 통신 기준, 현지인 제외</p></article>
    </div></section>
    <section id="visitor-trend" className="actual-section" tabIndex={-1} aria-labelledby="visitor-trend-title"><h2 id="visitor-trend-title">월별 방문 추이</h2><p>{selectedDistrict} · 구·군별 방문 건수, 같은 사람 중복 포함</p><VisitChart rows={summary.monthly} /><p className="actual-chart-source">자료: 한국관광 데이터랩(SKT 통신) · 구·군별 방문 합계(연인원), 같은 사람 중복 포함</p><div className="actual-table-wrap"><table><caption>월별 방문 건수와 전년 동월 비교</caption><thead><tr><th>월</th><th>방문 건수</th><th>전년 동월</th><th>증감률</th></tr></thead><tbody>{summary.monthly.map(row => <tr key={row.month}><th>{monthLabel(row.month)}</th><td>{numberLabel(row.visitors)}건</td><td>{row.previousYear === null ? '-' : `${numberLabel(row.previousYear)}건`}</td><td>{percentLabel(row.yoy)}</td></tr>)}</tbody></table></div></section>
    <section id="visitor-region" className="actual-section" tabIndex={-1} aria-labelledby="visitor-region-title"><h2 id="visitor-region-title">지역별 현황</h2><p>{monthLabel(summary.start)}~{monthLabel(summary.end)} · 구·군별 방문 건수</p><div className="actual-bars">{[...districtRows].sort((a, b) => b.visitors - a.visitors).map(row => <div className="actual-bar" key={row.code}><span>{row.name}</span><div><i style={{ width: `${row.visitors / Math.max(1, ...districtRows.map(item => item.visitors)) * 100}%` }} /></div><strong>{numberLabel(row.visitors)}건</strong></div>)}</div><div className="actual-table-wrap"><table><caption>구·군별 방문과 카드 소비</caption><thead><tr><th>구·군</th><th>방문 건수</th><th>카드 소비액</th></tr></thead><tbody>{districtRows.map(row => <tr key={row.code}><th>{row.name}</th><td>{numberLabel(row.visitors)}건</td><td>{numberLabel(row.spending)}원</td></tr>)}</tbody></table></div></section>
    <section id="visitor-industry" className="actual-section" tabIndex={-1} aria-labelledby="visitor-industry-title"><h2 id="visitor-industry-title">업종별 소비</h2><p>선택 기간 신용카드 소비 · 원 단위</p><label className="actual-country-filter">국가<select aria-label="업종별 소비 국가" value={country} onChange={event => setCountry(event.target.value)}><option value="all">전체 국가</option>{data.countries.filter(name => name !== '기타').map(name => <option key={name} value={name}>{name}</option>)}</select></label><div className="actual-bars">{[...industryRows].sort((a, b) => b.spending - a.spending).map(row => <div className="actual-bar" key={row.name}><span>{row.name}</span><div><i style={{ width: `${row.spending / industryMax * 100}%` }} /></div><strong>{numberLabel(row.spending)}원</strong></div>)}</div><div className="actual-table-wrap"><table><caption>업종별 카드 소비액</caption><thead><tr><th>업종</th><th>카드 소비액</th></tr></thead><tbody>{industryRows.map(row => <tr key={row.name}><th>{row.name}</th><td>{numberLabel(row.spending)}원</td></tr>)}</tbody></table></div><p className="actual-note">국가별 업종 자료에는 기타 국가의 업종 구분이 없습니다. 업종 합계와 전체 행의 원자료 차이는 0.01% 이내입니다.</p></section>
  </div></div>
}
