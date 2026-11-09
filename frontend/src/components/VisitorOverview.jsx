import { useEffect, useState } from 'react'
import { getOverview, monthLabel, numberLabel, rateLabel } from '../data/visitorDemo'
import { billionWonLabel, billionWonNumber, wonNumber } from '../data/displayFormat.js'
import { loadTourismOverviewData } from '../data/tourismOverviewData'
import OverviewTooltip from './OverviewTooltip'
import OverviewIndustryTrend from './OverviewIndustryTrend'
import Sparkline from './Sparkline'
import { getRecentMonths } from './sparklineUtils.js'
import './VisitorOverview.css'
import './TourismOverview.css'

function OverviewIcon({ name }) {
  const paths = {
    visitors: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-10m-6 0h6v6" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
    spending: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    perVisitor: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-3a6 6 0 0 1 10-4" /><circle cx="18" cy="17" r="4" /><path d="M18 15v4m-1-3h2m-2 2h2" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function MetricCard({ icon, label, value, unit, detail, change, accent, showChangeIndicator = false, valueChange, infoTooltip, href, actionText, trend }) {
  const Card = href ? 'a' : 'article'
  const hasTrend = Array.isArray(trend) && trend.length >= 3
  return <Card className={`overview-metric ${accent ? 'overview-metric-accent' : ''}${href ? ' metric-card-link' : ''}${hasTrend ? ' metric-card-with-trend' : ''}`} href={href} aria-label={href && hasTrend ? `${label} ${value}${unit || ''}${actionText ? `, ${actionText}` : ''}` : undefined}>
    <div className="metric-heading"><span>{label}</span><span className="metric-icon"><OverviewIcon name={icon} /></span></div>
    <p className={`metric-value${showChangeIndicator && valueChange !== undefined && valueChange !== null ? valueChange < 0 ? ' metric-value-decrease' : ' metric-value-increase' : ''}`}>{showChangeIndicator && valueChange !== undefined && valueChange !== null && <span className="metric-value-arrow" aria-hidden="true">{valueChange > 0 ? '↑' : valueChange < 0 ? '↓' : '→'}</span>}{value}<span>{unit}</span>{infoTooltip && <OverviewTooltip label={`${label} 집계 기준 안내`} text={infoTooltip} />}</p>
    <div className="metric-detail">{change !== undefined && <span className={change < 0 ? 'metric-change decrease' : 'metric-change'}>{showChangeIndicator && change !== null && <span aria-hidden="true">{change > 0 ? '↑ ' : change < 0 ? '↓ ' : '→ '}</span>}{rateLabel(change)}</span>}<span>{detail}</span></div>
    {actionText && <span className="metric-card-action">{actionText}</span>}
    {hasTrend && <Sparkline trend={trend} metric={icon} label={label} unit={unit} />}
  </Card>
}

export function MonthlyChart({ rows, compare, isExample = true, color = '#1687ca', compact = false }) {
  const [hoveredMonth, setHoveredMonth] = useState(null)
  const selected = rows.find((row) => row.month === hoveredMonth) || rows.at(-1)
  const width = compact ? 340 : 760, height = compact ? 220 : 275, left = compact ? 42 : 48, right = compact ? 10 : 20, top = 20, bottom = compact ? 32 : 38
  const max = Math.ceil(Math.max(...rows.map((row) => Math.max(row.visitors, compare ? row.previousYear || 0 : 0))) / 100000) * 100000
  const x = (index) => rows.length === 1 ? (width + left - right) / 2 : left + index * (width - left - right) / (rows.length - 1)
  const y = (value) => height - bottom - value / max * (height - top - bottom)
  const points = rows.map((row, i) => `${x(i)},${y(row.visitors)}`).join(' ')
  const area = `M${x(0)} ${height - bottom} L${points.replaceAll(',', ' ')} L${x(rows.length - 1)} ${height - bottom} Z`
  return <>
    <div className="chart-readout"><span>{monthLabel(selected.month)}</span><strong>{numberLabel(selected.visitors)} <small>명</small></strong><span className="chart-readout-growth">전년 동월 {rateLabel(selected.yoy)}</span></div>
    <svg className="monthly-chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${isExample ? '예시 데이터의 ' : ''}월별 외국인 방문객 추이. 차트와 표 전환에서 수치를 확인할 수 있습니다.`}>
      <defs><linearGradient id="visitor-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".2" /><stop offset="100%" stopColor={color} stopOpacity=".01" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(max * tick / 4)} y2={y(max * tick / 4)} stroke="#e9eef3" strokeDasharray={tick ? '3 4' : undefined} /><text x={left - 10} y={y(max * tick / 4) + 4} textAnchor="end" fill="var(--text-muted)" fontSize="var(--fs-xs)" fontVariantNumeric="tabular-nums">{max * tick / 4 / 10000}만</text></g>)}
      <path d={area} fill="url(#visitor-area)" />
      {compare && <polyline points={rows.map((row, i) => `${x(i)},${y(row.previousYear || 0)}`).join(' ')} fill="none" stroke="#a8b9ca" strokeWidth="2" strokeDasharray="5 5" />}
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      {rows.map((row, i) => <g key={row.month}>
        {(i % Math.ceil(rows.length / 6) === 0 || i === rows.length - 1) && <text x={x(i)} y={height - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="var(--fs-xs)" fontVariantNumeric="tabular-nums">{compact ? `${Number(row.month.slice(5))}월` : row.month.replace('-', '.')}</text>}
        <circle cx={x(i)} cy={y(row.visitors)} r={selected.month === row.month ? 5 : 3} fill="white" stroke={color} strokeWidth="2" />
        <circle cx={x(i)} cy={y(row.visitors)} r="13" fill="transparent" tabIndex="0" aria-label={`${monthLabel(row.month)}, ${numberLabel(row.visitors)}명, 전년 동월 대비 ${rateLabel(row.yoy)}`} onMouseEnter={() => setHoveredMonth(row.month)} onMouseLeave={() => setHoveredMonth(null)} onFocus={() => setHoveredMonth(row.month)} onBlur={() => setHoveredMonth(null)}><title>{monthLabel(row.month)} · {numberLabel(row.visitors)}명</title></circle>
      </g>)}
    </svg>
    <div className="chart-legend"><span><i className="legend-current" style={{ background: color }} />선택 기간</span>{compare && <span><i className="legend-previous" />전년 동월</span>}<span className="chart-unit">단위: 명{isExample && ' · 예시 데이터'}</span></div>
  </>
}

const sections = [['kpi', '핵심 지표 요약'], ['trend', '월별 방문 추이'], ['region', '지역별 현황'], ['industry', '업종별 소비']]

export default function VisitorOverview({ onOpen, focus = 'kpi', navigationKey }) {
  const [load, setLoad] = useState(null)
  const [retry, setRetry] = useState(0)
  const [period, setPeriod] = useState({ start: '', end: '' })
  const [compare, setCompare] = useState(true)
  const [display, setDisplay] = useState('chart')
  const [regionMetric, setRegionMetric] = useState('visitors')
  const [industryCode, setIndustryCode] = useState('shopping')
  const data = load?.retry === retry ? load.data : null
  const error = load?.retry === retry ? load.error : null

  useEffect(() => {
    const controller = new AbortController()
    loadTourismOverviewData({ signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setLoad({ retry, data: result })
    }).catch(failure => {
      if (!controller.signal.aborted) setLoad({ retry, error: failure.message || '관광 지표를 불러오지 못했습니다.' })
    })
    return () => controller.abort()
  }, [retry])
  useEffect(() => {
    if (!data) return
    const target = document.getElementById(`visitor-${sections.some(([key]) => key === focus) ? focus : 'kpi'}`)
    const frame = requestAnimationFrame(() => { target?.scrollIntoView({ block: 'start', behavior: 'instant' }); target?.focus({ preventScroll: true }) })
    return () => cancelAnimationFrame(frame)
  }, [focus, data, navigationKey])

  const breadcrumb = <nav className="overview-breadcrumb" aria-label="현재 위치"><a href="#/">홈</a><span aria-hidden="true">›</span><span aria-current="page">부산 관광 한눈에</span></nav>
  if (!data) return <div className="visitor-overview tourism-overview"><div className="overview-container">{breadcrumb}<div className="overview-title-row"><h1>부산 관광 한눈에</h1></div>{error ? <div className="tourism-empty" role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>다시 시도</button></div> : <p className="tourism-empty" role="status">방문·소비 지표를 불러오고 있습니다.</p>}</div></div>

  const selectableMonths = data.selectableMonths
  const end = selectableMonths.includes(period.end) ? period.end : data.asOf
  const start = selectableMonths.includes(period.start) && period.start <= end ? period.start : selectableMonths.includes(`${end.slice(0, 4)}-01`) ? `${end.slice(0, 4)}-01` : selectableMonths[0]
  const rows = data.monthly.filter(row => row.month >= start && row.month <= end)
  const latest = rows.at(-1)
  const trendRows = getRecentMonths(data.monthly, end)
  const topCountry = getOverview(end, end).countries.find(country => country.code !== 'ETC')
  const selectedIndustry = latest.industries.find(item => item.code === industryCode) || latest.industries[0]
  const regionRows = [...latest.districts].sort((a, b) => b[regionMetric] - a[regionMetric])
  const regionMax = Math.max(1, ...regionRows.map(row => row[regionMetric]))
  const chooseRange = months => setPeriod({ start: selectableMonths[Math.max(0, selectableMonths.indexOf(end) - months + 1)], end })
  const reset = () => { setPeriod({ start: '', end: '' }); setCompare(true) }
  const download = () => {
    const lines = ['자료 구분,기준월,방문객 수(명),전년 동월 방문객 수(명),전년 동월 대비(%),외국인 카드 소비액(원),소비액/방문객 수(원)', ...rows.map(row => [data.isMock ? '예시 자료' : '원자료', row.month, row.visitors, row.previousYear ?? '', row.yoy?.toFixed(1) ?? '', row.spending, row.perVisitorSpending].join(','))]
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = `맙소사_관광한눈에_${data.isMock ? '예시_' : ''}${start}_${end}.csv`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="visitor-overview tourism-overview">
    <div className="overview-container">
      {breadcrumb}
      <div className="overview-title-row"><div><h1>부산 관광 한눈에</h1><p className="overview-subtitle">얼마나 방문하고, 어디에서 소비했는지. 부산 외국인 관광의 흐름을 빠르게 확인하세요.</p></div><div className="tourism-data-reference"><strong>데이터 기준: {monthLabel(data.asOf)}</strong><span>원자료는 통상 약 {data.publicationLagMonths}개월 시차</span></div></div>
      {data.isMock && <div className="overview-demo-notice"><span>예시 자료</span><p>실제 관광 통계가 아닌 화면 미리보기용 자료입니다. 현재 예시 자료의 최신월은 {monthLabel(data.asOf)}입니다.</p><button onClick={() => onOpen('데이터 출처·기준')}>데이터 안내 ↗</button></div>}
      <nav className="tourism-section-links" aria-label="부산 관광 한눈에 섹션">{sections.map(([key, label]) => <a key={key} href={`#/visitors?focus=${key}`} aria-current={focus === key ? 'location' : undefined}>{label}<span aria-hidden="true">↘</span></a>)}</nav>
      <section className="overview-filters" aria-label="조회 조건">
        <div className="overview-filter-fields"><span className="filter-label"><OverviewIcon name="calendar" />조회 기간</span><label><span className="visually-hidden">시작 월</span><select aria-label="시작 월" value={start} onChange={event => setPeriod({ start: event.target.value, end: event.target.value > end ? event.target.value : end })}>{selectableMonths.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label><span className="filter-range-divider">—</span><label><span className="visually-hidden">종료 월</span><select aria-label="종료 월" value={end} onChange={event => setPeriod({ start: event.target.value < start ? event.target.value : start, end: event.target.value })}>{selectableMonths.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label></div>
        <div className="overview-filter-actions"><button className="range-preset" onClick={() => chooseRange(6)}>6개월</button><button className="range-preset" onClick={() => chooseRange(12)}>12개월</button><button className="filter-reset" onClick={reset}>초기화</button></div>
      </section>
      <div className="overview-period-caption"><span>카드·지역·업종 비중: <strong>{monthLabel(end)}</strong> · 월별 추이: {monthLabel(start)} — {monthLabel(end)}</span><button onClick={download}><OverviewIcon name="download" />{data.isMock ? '예시 데이터 CSV' : '데이터 CSV'}</button></div>

      <section id="visitor-kpi" className="tourism-section tourism-kpi" tabIndex={-1} aria-labelledby="visitor-kpi-title">
        <div className="tourism-section-heading"><div><h2 id="visitor-kpi-title">핵심 지표 요약</h2><p>{monthLabel(end)} 기준{data.isMock ? ' · 예시 자료' : ''}</p></div></div>
        <div className="overview-metrics">
          <MetricCard icon="visitors" label={`${end === data.asOf ? '최근월' : '선택월'} 외국인 방문객 수`} value={numberLabel(latest.visitors)} unit="명" change={latest.yoy} detail="전년 동월 대비" accent showChangeIndicator infoTooltip={data.visitorDefinition} trend={trendRows.map(row => ({ month: row.month, value: row.visitors }))} />
          <MetricCard icon="globe" label="방문객 1위 국가" value={topCountry.name} detail={`${numberLabel(topCountry.visitors)}명 · 전체 대비 ${topCountry.share.toFixed(1)}%`} href={`#/countries?focus=detail&country=${encodeURIComponent(topCountry.code)}`} actionText="국가별 상세 보기 ↗" />
          <MetricCard icon="spending" label="외국인 카드 소비액" value={billionWonNumber(latest.spending)} unit="억 원" change={latest.spendingYoy} detail="전년 동월 대비" showChangeIndicator trend={trendRows.map(row => ({ month: row.month, value: row.spending }))} />
          <MetricCard icon="perVisitor" label="1인당 소비액" value={wonNumber(latest.perVisitorSpending)} unit="원" detail="소비액 ÷ 방문객 수 · 원 단위 반올림" infoTooltip={data.perVisitorDefinition} trend={trendRows.map(row => ({ month: row.month, value: row.perVisitorSpending }))} />
        </div>
        <div className="tourism-quick-summary"><strong>{data.isMock ? '예시 자료로 읽는 한눈 요약' : '한눈 요약'}</strong><p>외국인 방문객 {numberLabel(latest.visitors)}명 · 전년 동월 대비 {rateLabel(latest.yoy)} · 방문객 1위 국가 {topCountry.name} {numberLabel(topCountry.visitors)}명(전체 대비 {topCountry.share.toFixed(1)}%) · 카드 소비액 {billionWonLabel(latest.spending)}. 아래에서 방문 흐름과 지역·업종별 구성을 확인하세요.</p></div>
      </section>

      <section id="visitor-trend" className="overview-panel tourism-section trend-panel" tabIndex={-1} aria-labelledby="visitor-trend-title">
        <div className="panel-heading"><div><h2 id="visitor-trend-title">월별 방문 추이</h2><p>같은 달의 방문객 수를 전년과 비교하세요.</p></div><div className="chart-view-toggle" aria-label="방문 추이 보기 방식"><button aria-pressed={display === 'chart'} onClick={() => setDisplay('chart')}>차트</button><button aria-pressed={display === 'table'} onClick={() => setDisplay('table')}>표</button></div></div>
        <label className="chart-compare"><input type="checkbox" checked={compare} onChange={event => setCompare(event.target.checked)} />전년 동월 함께 보기</label>
        {display === 'chart' ? <MonthlyChart rows={rows} compare={compare} isExample={data.isMock} /> : <div className="overview-table-scroll"><table className="overview-table"><caption className="visually-hidden">선택 기간 월별 외국인 방문객{data.isMock ? ' 예시 자료' : ''}</caption><thead><tr><th scope="col">기준 월</th><th scope="col">방문객 수</th>{compare && <th scope="col">전년 동월</th>}<th scope="col">전년 대비</th></tr></thead><tbody>{rows.map(row => <tr key={row.month}><th scope="row">{row.month.replace('-', '.')}</th><td>{numberLabel(row.visitors)}명</td>{compare && <td>{row.previousYear === null ? '자료 없음' : `${numberLabel(row.previousYear)}명`}</td>}<td>{rateLabel(row.yoy)}</td></tr>)}</tbody></table></div>}
        <p className="panel-footnote">{data.visitorDefinition} 월별 합산은 기간 전체의 중복 제거 인원과 다릅니다.</p>
      </section>

      <section id="visitor-region" className="overview-panel tourism-section" tabIndex={-1} aria-labelledby="visitor-region-title">
        <div className="panel-heading"><div><h2 id="visitor-region-title">지역별 현황 <OverviewTooltip label="구·군 방문객 집계 기준 안내" text={data.districtDefinition} /></h2><p>{monthLabel(end)} · 부산 16개 구·군{data.isMock ? ' · 예시 자료' : ''}</p></div><div className="chart-view-toggle" aria-label="지역별 지표"><button aria-pressed={regionMetric === 'visitors'} onClick={() => setRegionMetric('visitors')}>방문객</button><button aria-pressed={regionMetric === 'spending'} onClick={() => setRegionMetric('spending')}>카드 소비액</button></div></div>
        <div className="tourism-region-summary"><div><span>방문객 상위 3개 구·군 비중</span><strong>{latest.topThreeVisitorShare.toFixed(1)}%</strong><p>구·군별 방문객 집계 합계 대비</p></div><div><span>소비액 상위 3개 구·군 비중</span><strong>{latest.topThreeSpendingShare.toFixed(1)}%</strong><p>구·군별 카드 소비액 합계 대비</p></div></div>
        <ol className="tourism-region-bars" aria-label={`${monthLabel(end)} 구·군별 ${regionMetric === 'visitors' ? '방문객' : '카드 소비액'} 순위`}>{regionRows.map((district, index) => <li key={district.name}><span className="tourism-region-name"><small>{String(index + 1).padStart(2, '0')}</small>{district.name}</span><span className="tourism-bar-track" aria-hidden="true"><span className={index < 3 ? 'leading' : ''} style={{ width: `${district[regionMetric] / regionMax * 100}%` }} /></span><span className="tourism-region-value"><strong>{regionMetric === 'visitors' ? `${numberLabel(district.visitors)}명` : billionWonLabel(district.spending)}</strong><small>{(regionMetric === 'visitors' ? district.visitorShare : district.spendingShare).toFixed(1)}%</small></span></li>)}</ol>
        <p className="panel-footnote">구·군 방문객은 지역 간 중복 방문을 포함하며 합계가 부산 전체 방문객보다 클 수 있습니다. 순위 비중은 각 지표의 구·군별 합계를 기준으로 계산합니다.</p>
      </section>

      <section id="visitor-industry" className="overview-panel tourism-section" tabIndex={-1} aria-labelledby="visitor-industry-title">
        <div className="panel-heading"><div><h2 id="visitor-industry-title">업종별 소비</h2><p>{monthLabel(end)} 소비 비중과 선택 기간의 월별 추이{data.isMock ? ' · 예시 자료' : ''}</p></div></div>
        <div className="tourism-industry-grid"><div>
          <div className="tourism-industry-share" role="img" aria-label={`업종별 소비 비중: ${latest.industries.map(item => `${item.name} ${item.share.toFixed(1)}%`).join(', ')}`}>{latest.industries.map(item => <span key={item.code} style={{ width: `${item.share}%`, background: item.color || '#1687ca' }} />)}</div>
          <table className="overview-table tourism-industry-table"><caption>{monthLabel(end)} 업종별 카드 소비액 · 단위: 원</caption><thead><tr><th scope="col">업종</th><th scope="col">소비액</th><th scope="col">비중</th></tr></thead><tbody>{latest.industries.map(item => <tr key={item.code}><th scope="row"><i style={{ background: item.color || '#1687ca' }} />{item.name}</th><td>{numberLabel(item.spending)}</td><td>{item.share.toFixed(1)}%</td></tr>)}</tbody><tfoot><tr><th scope="row">월 전체 소비액</th><td>{numberLabel(latest.spending)}</td><td>{latest.spending ? '100.0%' : '—'}</td></tr></tfoot></table>
        </div><div className="tourism-industry-trend"><label className="tourism-industry-select">월별 추이 업종<select aria-label="월별 추이 업종" value={selectedIndustry.code} onChange={event => setIndustryCode(event.target.value)}>{latest.industries.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><p className="tourism-chart-unit">{selectedIndustry.name} 카드 소비액 · 차트 단위: 억 원</p><OverviewIndustryTrend rows={rows} industry={selectedIndustry} /><details className="tourism-industry-details"><summary>월별 소비액 표 확인</summary><table className="overview-table"><caption className="visually-hidden">{selectedIndustry.name} 월별 소비액 · 단위: 원</caption><thead><tr><th scope="col">기준 월</th><th scope="col">소비액(원)</th><th scope="col">월 전체 대비</th></tr></thead><tbody>{rows.map(row => { const item = row.industries.find(industry => industry.code === selectedIndustry.code); return <tr key={row.month}><th scope="row">{row.month.replace('-', '.')}</th><td>{item ? numberLabel(item.spending) : '자료 없음'}</td><td>{item ? `${item.share.toFixed(1)}%` : '—'}</td></tr> })}</tbody></table></details></div></div>
        <p className="panel-footnote">업종별 비중의 분모는 해당 월 전체 외국인 카드 소비액입니다. 업종별 금액은 원 단위로 합계가 일치하며, 표시 비중은 소수 첫째 자리로 반올림합니다.</p>
      </section>
      <div className="overview-source-note"><span>자료: {data.sourceLabel} · 데이터 최신월: {monthLabel(data.asOf)}</span><button onClick={() => onOpen('분석 범위 안내')}>집계 기준 확인 ↗</button></div>
    </div>
  </div>
}
