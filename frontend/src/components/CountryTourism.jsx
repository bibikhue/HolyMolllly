import { Children, cloneElement, useEffect, useState } from 'react'
import { monthLabel, numberLabel, rateLabel } from '../data/visitorDemo.js'
import { billionWonLabel, billionWonNumber, wonLabel, wonNumber } from '../data/displayFormat.js'
import { loadCountryTourismData } from '../data/countryTourismData.js'
import { MetricCard, MonthlyChart } from './VisitorOverview.jsx'
import { BubbleChart, SeasonHeatmap, YearLineChart } from './CountryTourismCharts.jsx'
import './VisitorOverview.css'
import './CountryTourism.css'

const sections = [
  ['compare', '국가 비교'],
  ['detail', '국가별 상세'],
  ['season', '계절성 비교'],
  ['interest', '언어권별 관심 관광지'],
]
const validFocus = value => sections.some(([key]) => key === value) ? value : 'compare'
const monthNumber = month => Number(month.slice(-2))
const yearNumber = month => Number(month.slice(0, 4))
const countryIn = (month, code) => month?.countries.find(item => item.code === code)
const percentLabel = value => value == null ? '—' : `${value.toFixed(1)}%`
const billionLabel = value => billionWonLabel(value, { compact: true })

function CountryHeading({ title, description, month, isMock = false }) {
  return <div className="country-section-heading">
    <h2>{title}</h2>
    <p>{description}</p>
    {month && <span className="country-heading-month">기준: {monthLabel(month)}{isMock ? ' · 예시 자료' : ''}</span>}
  </div>
}

function NumberTable({ caption, headers, rows }) {
  const labelledRows = Children.map(rows, row => cloneElement(row, {
    children: Children.map(row.props.children, (cell, index) =>
      cloneElement(cell, { 'data-label': headers[index] })),
  }))
  return <div className="country-table-scroll" role="region" aria-label={`${caption} 표`} tabIndex="0">
    <table className="country-table"><caption>{caption}</caption><thead><tr>{headers.map((header, index) => <th scope="col" key={index}>{header}</th>)}</tr></thead><tbody>{labelledRows}</tbody></table>
  </div>
}

function CompareSection({ monthly, data, selectedMonth, onMonthChange, openCountry }) {
  const countries = monthly.countries.filter(item => item.code !== 'ETC').sort((a, b) => b.visitors - a.visitors)
  const other = monthly.countries.find(item => item.code === 'ETC')
  const tableCountries = other ? [...countries, other] : countries
  const byRank = (field) => [...countries].filter(item => Number.isFinite(item[field]))
    .sort((a, b) => b[field] - a[field] || b.visitors - a.visitors || a.code.localeCompare(b.code))[0]
  const spendingLeader = byRank('perVisitorWon')
  const growthLeader = byRank('yoyPercent')
  const topThree = countries.slice(0, 3)
  const topThreeNames = topThree.map(item => item.name).join(' · ')
  const topThreeShare = topThree.reduce((total, item) => total + item.visitors, 0) / monthly.visitors * 100
  return <section className="country-panel country-section" id="country-compare" tabIndex={-1} aria-labelledby="country-compare-title">
    <div className="country-section-top"><CountryHeading title="국가 비교" description="방문 규모와 소비 수준을 같은 기준월에서 비교합니다." month={selectedMonth} isMock={data.isMock} /><label className="country-field">기준월<select value={selectedMonth} onChange={event => onMonthChange(event.target.value)} aria-label="국가 비교 기준월">{data.selectableMonths.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label></div>
    <h2 id="country-compare-title" className="visually-hidden">국가 비교 지표와 차트</h2>
    <div className="country-metrics">
      <MetricCard icon="perVisitor" label="1인당 소비 1위 국가" value={spendingLeader?.name ?? '자료 없음'} detail={spendingLeader ? wonLabel(spendingLeader.perVisitorWon) : '계산 가능한 국가 없음'} accent />
      <MetricCard icon="trend" label="전년 동월 대비 증가율 1위 국가" value={growthLeader?.name ?? '자료 없음'} detail={growthLeader ? rateLabel(growthLeader.yoyPercent) : '비교 가능한 국가 없음'} />
      <MetricCard icon="globe" label="상위 3개국 비중" value={topThreeShare.toFixed(1)} unit="%" detail={`${topThreeNames} · 전체 방문객 대비`} />
    </div>
    <p className="country-summary">{monthLabel(selectedMonth)} 기준, {spendingLeader ? `1인당 소비액이 가장 높은 국가는 ${spendingLeader.name}(${wonLabel(spendingLeader.perVisitorWon)})입니다.` : '1인당 소비액을 계산할 국가 자료가 없습니다.'} {growthLeader ? `전년 동월 대비 증가율이 가장 높은 국가는 ${growthLeader.name}(${rateLabel(growthLeader.yoyPercent)})입니다.` : '전년 동월과 비교할 국가 자료가 없습니다.'} 방문객 상위 3개국({topThreeNames})의 합계 비중은 전체 방문객 대비 {percentLabel(topThreeShare)}입니다.</p>
    <div className="country-chart-card"><div className="country-card-title"><h3>방문 규모와 소비 수준</h3><p>가로: 방문객 수 · 세로: 1인당 소비액 · 원 면적: 총 소비액</p></div><BubbleChart countries={countries} /><p className="country-chart-note">원 면적은 총 소비액에 비례합니다. 기타는 여러 국가의 합계여서 차트에서 제외하고 아래 표에 표시합니다.</p></div>
    <NumberTable caption={`${monthLabel(selectedMonth)} 국가별 방문·소비 비교${data.isMock ? ' · 예시 자료' : ''}`} headers={['국가', '방문객', '전체 비중', '전년 동월 대비', '소비액', '1인당 소비액']} rows={tableCountries.map(item => <tr key={item.code}><th scope="row"><span className="country-table-name"><i style={{ backgroundColor: item.color }} />{item.name}{item.code !== 'ETC' && <button type="button" onClick={() => openCountry(item.code)} aria-label={`${item.name} 상세 보기`}>상세 보기</button>}</span></th><td>{numberLabel(item.visitors)}명</td><td>{percentLabel(item.share)}</td><td>{rateLabel(item.yoyPercent)}</td><td>{billionLabel(item.spendingWon)}</td><td>{wonLabel(item.perVisitorWon)}</td></tr>)} />
  </section>
}

function DetailSection({ data, monthly, selectedMonth, onMonthChange, selectedCountry, openCountry }) {
  const current = countryIn(monthly, selectedCountry.code)
  const selectedYear = yearNumber(selectedMonth)
  const yearMonths = data.months.filter(item => yearNumber(item.month) === selectedYear)
  const visitorRows = yearMonths.map(month => {
    const item = countryIn(month, selectedCountry.code)
    return { month: month.month, visitors: item.visitors, previousYear: item.previousYearVisitors, yoy: item.yoyPercent }
  })
  const availableYears = [...new Set(data.months.map(item => yearNumber(item.month)))].sort((a, b) => b - a)
  const valueFor = (year, month, field) => countryIn(data.months.find(item => item.month === `${year}-${String(month).padStart(2, '0')}`), selectedCountry.code)?.[field] ?? null
  const spendingSeries = [selectedYear, selectedYear - 1].filter(year => availableYears.includes(year)).map(year => ({ label: `${year}년`, values: Array.from({ length: 12 }, (_, index) => valueFor(year, index + 1, 'spendingWon')) }))
  const perVisitorSeries = availableYears.filter(year => data.months.filter(item => yearNumber(item.month) === year).length === 12).map(year => ({ label: `${year}년`, values: Array.from({ length: 12 }, (_, index) => valueFor(year, index + 1, 'perVisitorWon')) }))
  const districts = [...current.districts].sort((a, b) => b.visits - a.visits)
  const industries = [...current.industries].sort((a, b) => b.spendingWon - a.spendingWon)
  return <section className="country-section" id="country-detail" tabIndex={-1} aria-labelledby="country-detail-title">
    <div className="country-panel"><div className="country-section-top"><CountryHeading title="국가별 상세" description="한 국가의 월별 방문·소비와 지역·업종 구성을 확인합니다." month={selectedMonth} isMock={data.isMock} /><div className="country-selector-group"><label className="country-field">국가<select value={selectedCountry.code} onChange={event => openCountry(event.target.value)} aria-label="상세 국가 선택">{data.countryOptions.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label className="country-field">기준월<select value={selectedMonth} onChange={event => onMonthChange(event.target.value)} aria-label="국가 상세 기준월">{data.selectableMonths.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label></div></div>
      <h2 id="country-detail-title" className="visually-hidden">{selectedCountry.name} 상세 지표</h2>
      <div className="country-selected-name"><i style={{ backgroundColor: selectedCountry.color }} /><strong>{selectedCountry.name}</strong><span>{monthLabel(selectedMonth)}</span></div>
      <div className="country-metrics"><MetricCard icon="visitors" label="방문객" value={numberLabel(current.visitors)} unit="명" change={current.yoyPercent} detail="전년 동월 대비" /><MetricCard icon="spending" label="관광 소비액" value={billionWonNumber(current.spendingWon)} unit="억원" detail="해당 국가 소비액" /><MetricCard icon="perVisitor" label="1인당 소비액" value={wonNumber(current.perVisitorWon)} unit="원" detail="소비액 ÷ 방문객 수" /></div>
      <p className="country-summary">{monthLabel(selectedMonth)} {selectedCountry.name} 방문객은 {numberLabel(current.visitors)}명이며, 전년 동월 대비 {rateLabel(current.yoyPercent)}입니다. 관광 소비액은 {billionLabel(current.spendingWon)}, 1인당 소비액은 {wonLabel(current.perVisitorWon)}입니다.</p>
    </div>
    <div className="country-detail-grid">
      <div className="country-panel country-detail-wide"><div className="country-card-title"><h3>{selectedYear}년 월별 방문객</h3><p>실선: 선택 연도 · 점선: 전년 동월</p></div><div className="country-desktop-monthly"><MonthlyChart rows={visitorRows} compare color={selectedCountry.color} isExample={data.isMock} /></div><div className="country-mobile-monthly"><MonthlyChart rows={visitorRows} compare color={selectedCountry.color} isExample={data.isMock} compact /></div><details className="country-numeric-details"><summary>월별 방문객 수치 표</summary><NumberTable caption={`${selectedCountry.name} ${selectedYear}년 월별 방문객`} headers={['월', '방문객', '전년 동월', '증감률']} rows={visitorRows.map(item => <tr key={item.month}><th scope="row">{monthLabel(item.month)}</th><td>{numberLabel(item.visitors)}명</td><td>{item.previousYear == null ? '자료 없음' : `${numberLabel(item.previousYear)}명`}</td><td>{rateLabel(item.yoy)}</td></tr>)} /></details></div>
      <div className="country-panel country-detail-wide"><div className="country-card-title"><h3>월별 관광 소비액</h3><p>{selectedYear}년과 전년의 월별 소비액</p></div><YearLineChart series={spendingSeries} color={selectedCountry.color} unit="억원" valueLabel={billionLabel} ariaLabel={`${selectedCountry.name} 연도별 월간 관광 소비액 추이. 정확한 값은 아래 수치 표에서 확인할 수 있습니다.`} /><details className="country-numeric-details"><summary>월별 소비액 수치 표</summary><NumberTable caption={`${selectedCountry.name} 월별 소비액`} headers={['월', ...spendingSeries.map(item => item.label)]} rows={Array.from({ length: 12 }, (_, index) => <tr key={index}><th scope="row">{index + 1}월</th>{spendingSeries.map(item => <td key={item.label}>{item.values[index] == null ? '자료 없음' : billionLabel(item.values[index])}</td>)}</tr>)} /></details></div>
      <div className="country-panel country-detail-wide"><div className="country-card-title"><h3>연도별 월간 1인당 소비 패턴</h3><p>각 연도의 같은 달을 겹쳐 비교합니다. 값은 해당 월 소비액 ÷ 방문객 수입니다.</p></div><YearLineChart series={perVisitorSeries} color={selectedCountry.color} unit="원/명" ariaLabel={`${selectedCountry.name} 연도별 월간 1인당 소비액 패턴. 정확한 값은 아래 수치 표에서 확인할 수 있습니다.`} /><details className="country-numeric-details"><summary>연도별 1인당 소비액 수치 표</summary><NumberTable caption={`${selectedCountry.name} 연도별 월간 1인당 소비액`} headers={['월', ...perVisitorSeries.map(item => item.label)]} rows={Array.from({ length: 12 }, (_, index) => <tr key={index}><th scope="row">{index + 1}월</th>{perVisitorSeries.map(item => <td key={item.label}>{item.values[index] == null ? '자료 없음' : wonLabel(item.values[index])}</td>)}</tr>)} /></details></div>
      <div className="country-panel"><div className="country-card-title"><h3>주요 방문 구·군</h3><p>{monthLabel(selectedMonth)} · 구·군별 방문 건수</p></div><ol className="country-ranked-bars">{districts.slice(0, 8).map((item, index) => <li key={item.code}><span>{index + 1}. {item.name}</span><div className="country-bar-track" aria-hidden="true"><i style={{ width: `${districts[0].visits ? item.visits / districts[0].visits * 100 : 0}%`, backgroundColor: selectedCountry.color }} /></div><strong>{numberLabel(item.visits)}건</strong></li>)}</ol><p className="country-chart-note">구·군 방문은 중복 가능하며, 합계는 부산 전체 순방문객 수와 다를 수 있습니다.</p></div>
      <div className="country-panel"><div className="country-card-title"><h3>소비 업종 구성</h3><p>{monthLabel(selectedMonth)} · 업종별 소비액 비중</p></div><ol className="country-ranked-bars">{industries.map(item => <li key={item.code}><span>{item.name}</span><div className="country-bar-track" aria-hidden="true"><i style={{ width: `${item.share}%`, backgroundColor: selectedCountry.color }} /></div><strong>{percentLabel(item.share)}</strong></li>)}</ol><p className="country-chart-note">업종 합계 {billionLabel(industries.reduce((sum, item) => sum + item.spendingWon, 0))} · 해당 국가 소비액과 동일</p></div>
    </div>
  </section>
}

function SeasonSection({ data }) {
  const year = data.latestFullYear
  const rows = data.seasonality.filter(item => item.year === year)
  const annualTotal = code => rows.filter(item => item.code === code).reduce((sum, item) => sum + item.visitors, 0)
  const countries = [...data.countryOptions].sort((a, b) => annualTotal(b.code) - annualTotal(a.code))
  const byKey = new Map(rows.map(item => [`${item.code}:${monthNumber(item.month)}`, item]))
  return <section className="country-panel country-section" id="country-season" tabIndex={-1} aria-labelledby="country-season-title">
    <CountryHeading title="계절성 비교" description="국가별 월평균 방문객 수를 100으로 놓고 각 달의 상대적 수준을 비교합니다." />
    <h2 id="country-season-title" className="visually-hidden">{year}년 국가별 계절성 히트맵</h2>
    <div className="country-heatmap-intro"><strong>{year}년 월별 방문객 지수</strong><span>100 = 해당 국가의 {year}년 월평균 · 100에서 멀수록 진한 색</span></div>
    <div className="country-heatmap-legend" role="group" aria-label="평균보다 적음 ← 100 → 평균보다 많음"><span>평균보다 적음</span><span aria-hidden="true">←</span><strong>100</strong><span aria-hidden="true">→</span><span>평균보다 많음</span><i aria-hidden="true" /></div>
    <SeasonHeatmap rows={rows} countries={countries} year={year} />
    <p className="country-chart-note">모든 칸에 같은 색 기준을 적용하고, 왼쪽 표식만 국가별 고유 색상입니다. 지수는 각 국가의 월 방문객 수 ÷ 해당 연도 월평균 방문객 수 × 100으로 계산합니다. 회색은 자료가 없는 달입니다.</p>
    <details className="country-numeric-details"><summary>월별 지수 수치 표</summary><NumberTable caption={`${year}년 국가별 월별 방문객 지수 · 국가 연평균 100`} headers={['국가', ...Array.from({ length: 12 }, (_, index) => `${index + 1}월`)]} rows={countries.map(country => <tr key={country.code}><th scope="row"><span className="country-table-name"><i style={{ backgroundColor: country.color }} />{country.name}</span></th>{Array.from({ length: 12 }, (_, index) => { const value = byKey.get(`${country.code}:${index + 1}`)?.index; return <td key={index}>{value == null ? '—' : value.toFixed(1)}</td> })}</tr>)} /></details>
  </section>
}

function InterestSection() {
  return <section className="country-panel country-section country-coming-soon" id="country-interest" tabIndex={-1} aria-labelledby="country-interest-title"><CountryHeading title="언어권별 관심 관광지" description="언어권별 관심 관광지 자료를 준비하고 있습니다." /><div className="country-soon-card"><span>준비 중</span><h2 id="country-interest-title">관심 관광지 데이터를 준비하고 있습니다.</h2><p>자료가 확보되면 언어권별 구·군 비교와 상위 관광지를 이곳에서 확인할 수 있습니다.</p></div></section>
}

export default function CountryTourism({ focus = 'compare', country, navigationKey, onOpen }) {
  const [load, setLoad] = useState(null)
  const [retry, setRetry] = useState(0)
  const [monthChoice, setMonthChoice] = useState('')
  const data = load?.retry === retry ? load.data : null
  const error = load?.retry === retry ? load.error : null
  const activeFocus = validFocus(focus)

  useEffect(() => {
    const controller = new AbortController()
    loadCountryTourismData({ signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setLoad({ retry, data: result })
    }).catch(failure => {
      if (!controller.signal.aborted) setLoad({ retry, error: failure.message || '국가별 관광 자료를 불러오지 못했습니다.' })
    })
    return () => controller.abort()
  }, [retry])

  useEffect(() => {
    if (!data) return
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`country-${activeFocus}`)
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeFocus, data, navigationKey])

  const breadcrumb = <nav className="overview-breadcrumb" aria-label="현재 위치"><a href="#/">홈</a><span aria-hidden="true">›</span><span aria-current="page">국가별 관광</span></nav>
  if (!data) return <div className="country-tourism"><div className="country-shell">{breadcrumb}<h1>국가별 관광</h1>{error ? <div className="country-load-message" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div> : <p className="country-load-message" role="status">국가별 관광 자료를 불러오고 있습니다.</p>}</div></div>

  const selectedMonth = data.selectableMonths.includes(monthChoice) ? monthChoice : data.latestMonth
  const monthly = data.months.find(item => item.month === selectedMonth)
  const selectedCountry = data.countryOptions.find(item => item.code === country) || [...data.countryOptions].sort((a, b) => countryIn(monthly, b.code).visitors - countryIn(monthly, a.code).visitors)[0]
  const openCountry = code => {
    const url = `#/countries?focus=detail&country=${encodeURIComponent(code)}`
    if (onOpen) onOpen(url)
    else window.location.hash = url.slice(1)
  }

  return <div className="country-tourism"><div className="country-shell">
    {breadcrumb}
    <div className="country-page-head"><div><h1>국가별 관광</h1><p>국가별 방문 규모와 소비, 계절성을 같은 월 기준으로 살펴보세요.</p></div><div className="country-as-of"><strong>데이터 기준월: {monthLabel(data.asOf)}</strong><span>{data.isMock ? '방문객·소비액은 예시 자료' : data.sourceLabel}</span></div></div>
    {data.isMock && <div className="country-demo-notice"><strong>예시 자료</strong><span>실제 관광 통계가 아닌 화면 미리보기용 자료입니다. 방문객 수는 부산 관광 한눈에와 같은 원천을 사용합니다.</span></div>}
    <nav className="country-section-nav" aria-label="국가별 관광 하위 메뉴">{sections.map(([key, label]) => <a key={key} href={`#/countries?focus=${key}`} aria-current={activeFocus === key ? 'location' : undefined}>{label}</a>)}</nav>
    {activeFocus === 'compare' && <CompareSection monthly={monthly} data={data} selectedMonth={selectedMonth} onMonthChange={setMonthChoice} openCountry={openCountry} />}
    {activeFocus === 'detail' && <DetailSection data={data} monthly={monthly} selectedMonth={selectedMonth} onMonthChange={setMonthChoice} selectedCountry={selectedCountry} openCountry={openCountry} />}
    {activeFocus === 'season' && <SeasonSection data={data} />}
    {activeFocus === 'interest' && <InterestSection />}
    <p className="country-source-note">{data.sourceLabel} · 소비액과 방문객 수를 나눠 1인당 소비액을 계산했습니다. 실제 자료로 교체할 때 국가·월·업종의 집계 기준을 함께 확인해야 합니다.</p>
  </div></div>
}
