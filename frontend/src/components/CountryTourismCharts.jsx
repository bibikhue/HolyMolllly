import { numberLabel } from '../data/visitorDemo.js'
import { compactAxisLabel, mobileAxisTicks, niceAxis, seasonCellColors } from './countryChartUtils.js'

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

const wonLabel = value => `${numberLabel(Math.round(value))}원`
const billionLabel = value => `${(value / 100_000_000).toFixed(1)}억원`

export function BubbleChart({ countries }) {
  if (!countries.length) return <p className="country-empty">표시할 국가가 없습니다.</p>
  const width = 900, height = 420, left = 100, right = 95, top = 38, bottom = 66
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const visitorAxis = niceAxis(Math.max(...countries.map(country => country.visitors)))
  const perVisitorAxis = niceAxis(Math.max(...countries.map(country => country.perVisitorWon)))
  const maxSpending = Math.max(1, ...countries.map(country => country.spendingWon))
  const x = value => left + value / visitorAxis.max * plotWidth
  const y = value => height - bottom - value / perVisitorAxis.max * plotHeight
  const radius = value => 36 * Math.sqrt(value / maxSpending)

  return <>
    <svg className="country-bubble-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="국가별 방문객 수, 1인당 소비액, 총 소비액을 비교하는 버블 차트. 정확한 값은 아래 표에서 확인할 수 있습니다.">
    {visitorAxis.ticks.map(tick => <g key={`x-${tick}`}>
      <line x1={x(tick)} x2={x(tick)} y1={top} y2={height - bottom} stroke="#e6edf3" />
      <text x={x(tick)} y={height - bottom + 22} textAnchor="middle" className="country-svg-tick">{compactAxisLabel(tick)}</text>
    </g>)}
    {perVisitorAxis.ticks.map(tick => <g key={`y-${tick}`}>
      <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#e6edf3" />
      <text x={left - 13} y={y(tick) + 4} textAnchor="end" className="country-svg-tick">{compactAxisLabel(tick, 'won')}</text>
    </g>)}
    <text x={left + plotWidth / 2} y={height - 12} textAnchor="middle" className="country-svg-axis">방문객 수 (명)</text>
    <text x="19" y={top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 19 ${top + plotHeight / 2})`} className="country-svg-axis">1인당 소비액 (원)</text>
    {countries.map(country => {
      const cx = x(country.visitors), cy = y(country.perVisitorWon), r = radius(country.spendingWon)
      const labelLeft = cx > width - right - 95
      return <g key={country.code}>
        <circle cx={cx} cy={cy} r={r} fill={country.color} fillOpacity=".58" stroke={country.color} strokeWidth="2"><title>{`${country.name}: 방문객 ${numberLabel(country.visitors)}명, 1인당 소비액 ${wonLabel(country.perVisitorWon)}, 총 소비액 ${billionLabel(country.spendingWon)}`}</title></circle>
        <text x={cx + (labelLeft ? -r - 7 : r + 7)} y={cy + 4} textAnchor={labelLeft ? 'end' : 'start'} className="country-bubble-label">{country.name}</text>
      </g>
    })}
    </svg>
    <CompactBubbleChart countries={countries} visitorAxis={visitorAxis} perVisitorAxis={perVisitorAxis} />
  </>
}

function CompactBubbleChart({ countries, visitorAxis, perVisitorAxis }) {
  const width = 320, height = 285, left = 62, right = 27, top = 26, bottom = 43
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const maxSpending = Math.max(1, ...countries.map(country => country.spendingWon))
  const x = value => left + value / visitorAxis.max * plotWidth
  const y = value => height - bottom - value / perVisitorAxis.max * plotHeight
  return <svg className="country-bubble-chart-mobile" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="국가별 방문객 수와 1인당 소비액을 비교하는 모바일 버블 차트. 원 크기는 총 소비액입니다.">
    {mobileAxisTicks(visitorAxis.ticks).map(tick => <g key={`x-${tick}`}>
      <line x1={x(tick)} x2={x(tick)} y1={top} y2={height - bottom} stroke="#e6edf3" />
      <text x={x(tick)} y={height - bottom + 16} textAnchor="middle" className="country-svg-tick">{compactAxisLabel(tick)}</text>
    </g>)}
    {mobileAxisTicks(perVisitorAxis.ticks).map(tick => <g key={`y-${tick}`}>
      <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#e6edf3" />
      <text x={left - 5} y={y(tick) + 3} textAnchor="end" className="country-svg-tick">{compactAxisLabel(tick, 'won')}</text>
    </g>)}
    <text x={left + plotWidth / 2} y={height - 4} textAnchor="middle" className="country-svg-axis">방문객 수</text>
    <text x="10" y={top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 10 ${top + plotHeight / 2})`} className="country-svg-axis">1인당 소비액</text>
    {countries.map(country => {
      const cx = x(country.visitors), cy = y(country.perVisitorWon)
      const radius = 20 * Math.sqrt(country.spendingWon / maxSpending)
      return <g key={country.code}>
        <circle cx={cx} cy={cy} r={radius} fill={country.color} fillOpacity=".58" stroke={country.color} strokeWidth="1.5"><title>{`${country.name}: 방문객 ${numberLabel(country.visitors)}명, 1인당 소비액 ${wonLabel(country.perVisitorWon)}, 총 소비액 ${billionLabel(country.spendingWon)}`}</title></circle>
        <text x={cx} y={cy - radius - 6} textAnchor="middle" className="country-bubble-label">{country.name}</text>
      </g>
    })}
  </svg>
}

function pointsFor(values, x, y) {
  const segments = []
  let current = []
  values.forEach((value, index) => {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      if (current.length) segments.push(current)
      current = []
    } else current.push(`${x(index)},${y(value)}`)
  })
  if (current.length) segments.push(current)
  return segments
}

export function YearLineChart({ series, color, unit, valueLabel = wonLabel, ariaLabel }) {
  const width = 760, height = 255, left = 72, right = 20, top = 24, bottom = 43
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const axis = niceAxis(Math.max(1, ...series.flatMap(item => item.values.filter(value => Number.isFinite(value)))))
  const max = axis.max
  const x = index => left + index / 11 * plotWidth
  const y = value => height - bottom - value / max * plotHeight
  const dash = ['', '6 5', '2 5', '10 3 2 3']
  const mobileWidth = 320, mobileHeight = 230, mobileLeft = 72, mobileRight = 10, mobileTop = 24, mobileBottom = 35
  const mobileX = index => mobileLeft + index / 11 * (mobileWidth - mobileLeft - mobileRight)
  const mobileY = value => mobileHeight - mobileBottom - value / max * (mobileHeight - mobileTop - mobileBottom)
  return <>
    <svg className="country-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
      {axis.ticks.map(tick => <g key={tick}>
        <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#e6edf3" />
        <text x={left - 9} y={y(tick) + 4} textAnchor="end" className="country-svg-tick">{compactAxisLabel(tick, unit === '억원' ? 'spending' : 'won')}</text>
      </g>)}
      {MONTHS.map((month, index) => <text key={month} x={x(index)} y={height - 15} textAnchor="middle" className="country-svg-tick">{month}월</text>)}
      {series.map((item, index) => <g key={item.label}>
        {pointsFor(item.values, x, y).map((segment, segmentIndex) => <polyline key={segmentIndex} points={segment.join(' ')} fill="none" stroke={color} strokeWidth={index === 0 ? 3 : 2} strokeOpacity={Math.max(.42, 1 - index * .21)} strokeDasharray={dash[index % dash.length]} strokeLinejoin="round" />)}
        {item.values.map((value, monthIndex) => Number.isFinite(value) && <circle key={monthIndex} cx={x(monthIndex)} cy={y(value)} r={index === 0 ? 3.6 : 2.8} fill="#fff" stroke={color} strokeWidth="1.7" strokeOpacity={Math.max(.42, 1 - index * .21)}><title>{`${item.label} ${monthIndex + 1}월: ${valueLabel(value)}`}</title></circle>)}
      </g>)}
      <text x={left} y="16" className="country-svg-unit">단위: {unit}</text>
    </svg>
    <svg className="country-line-chart-mobile" viewBox={`0 0 ${mobileWidth} ${mobileHeight}`} role="img" aria-label={ariaLabel}>
      {mobileAxisTicks(axis.ticks).map(tick => <g key={tick}>
        <line x1={mobileLeft} x2={mobileWidth - mobileRight} y1={mobileY(tick)} y2={mobileY(tick)} stroke="#e6edf3" />
        <text x={mobileLeft - 5} y={mobileY(tick) + 3} textAnchor="end" className="country-svg-tick">{compactAxisLabel(tick, unit === '억원' ? 'spending' : 'won')}</text>
      </g>)}
      {MONTHS.filter(month => month % 2 === 1 || month === 12).map(month => <text key={month} x={mobileX(month - 1)} y={mobileHeight - 12} textAnchor="middle" className="country-svg-tick">{month}월</text>)}
      {series.map((item, index) => <g key={item.label}>
        {pointsFor(item.values, mobileX, mobileY).map((segment, segmentIndex) => <polyline key={segmentIndex} points={segment.join(' ')} fill="none" stroke={color} strokeWidth={index === 0 ? 2.6 : 1.8} strokeOpacity={Math.max(.42, 1 - index * .21)} strokeDasharray={dash[index % dash.length]} strokeLinejoin="round" />)}
        {item.values.map((value, monthIndex) => Number.isFinite(value) && <circle key={monthIndex} cx={mobileX(monthIndex)} cy={mobileY(value)} r={index === 0 ? 3 : 2.4} fill="#fff" stroke={color} strokeWidth="1.5" strokeOpacity={Math.max(.42, 1 - index * .21)}><title>{`${item.label} ${monthIndex + 1}월 ${valueLabel(value)}`}</title></circle>)}
      </g>)}
      <text x={mobileLeft} y="14" className="country-svg-unit">단위: {unit}</text>
    </svg>
    <div className="country-chart-legend">{series.map((item, index) => <span key={item.label}><i style={{ borderTopColor: color, borderTopStyle: index ? 'dashed' : 'solid', opacity: Math.max(.42, 1 - index * .21) }} />{item.label}</span>)}</div>
  </>
}

export function SeasonHeatmap({ rows, countries, year }) {
  const width = 900, left = 96, top = 35, cellWidth = 65, cellHeight = 45
  const height = top + countries.length * cellHeight + 22
  const byKey = new Map(rows.map(row => [`${row.code}:${Number(row.month.slice(-2))}`, row]))
  return <div className="country-heatmap-scroll" role="region" aria-label="계절성 히트맵 가로 스크롤" tabIndex="0">
    <svg className="country-heatmap" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${year}년 국가별 연평균 대비 월별 방문객 지수 히트맵. 정확한 값은 아래 수치 표에서 확인할 수 있습니다.`}>
      {MONTHS.map((month, index) => <text key={month} x={left + index * cellWidth + cellWidth / 2} y="23" textAnchor="middle" className="country-svg-tick">{month}월</text>)}
      {countries.map((country, rowIndex) => <g key={country.code}>
        <circle cx="10" cy={top + rowIndex * cellHeight + 17} r="5" fill={country.color} />
        <text x="22" y={top + rowIndex * cellHeight + 21} className="country-heatmap-label">{country.name}</text>
        {MONTHS.map((month, columnIndex) => {
          const row = byKey.get(`${country.code}:${month}`)
          const value = row?.index
          const colors = seasonCellColors(value)
          return <g key={month}>
            <rect x={left + columnIndex * cellWidth + 2} y={top + rowIndex * cellHeight + 2} width={cellWidth - 4} height={cellHeight - 5} rx="4" fill={colors.fill} />
            <text x={left + columnIndex * cellWidth + cellWidth / 2} y={top + rowIndex * cellHeight + 25} textAnchor="middle" className="country-heatmap-value" style={{ fill: colors.text }}>{value == null ? '—' : Math.round(value)}</text>
          </g>
        })}
      </g>)}
    </svg>
  </div>
}
