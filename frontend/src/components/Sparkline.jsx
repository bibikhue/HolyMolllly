import { monthLabel, numberLabel } from '../data/visitorDemo.js'
import { billionWonLabel, wonLabel } from '../data/displayFormat.js'
import { getLatestPeak, getSparklineRange } from './sparklineUtils.js'

const chartWidth = 100
const chartHeight = 32
const metrics = {
  visitors: { name: '방문객', format: value => `${numberLabel(value)}명` },
  spending: { name: '카드 소비액', format: billionWonLabel },
  perVisitor: { name: '1인당 소비액', format: wonLabel },
}

function shortMonth(month) {
  return `${month.slice(2, 4)}.${month.slice(5)}`
}

export default function Sparkline({ trend, metric, label, unit }) {
  if (!Array.isArray(trend) || trend.length < 3) return null

  const { name, format } = metrics[metric] || { name: label, format: value => `${numberLabel(value)}${unit || ''}` }
  const rows = [...trend].sort((left, right) => left.month.localeCompare(right.month))
  const first = rows[0]
  const last = rows.at(-1)
  const peak = getLatestPeak(rows)
  const range = getSparklineRange(rows.map(row => row.value))
  const x = index => 5 + index * (chartWidth - 10) / (rows.length - 1)
  const y = value => 3 + (range.max - value) / (range.max - range.min) * (chartHeight - 6)
  const points = rows.map((row, index) => `${x(index)},${y(row.value)}`).join(' ')
  const area = `M ${x(0)} ${chartHeight} L ${rows.map((row, index) => `${x(index)} ${y(row.value)}`).join(' L ')} L ${x(rows.length - 1)} ${chartHeight} Z`
  const description = `최근 ${rows.length}개월 ${name} 추이. ${monthLabel(first.month)} ${format(first.value)}에서 ${monthLabel(last.month)} ${format(last.value)}. 최고 ${monthLabel(peak.month)}.`

  return <div className="metric-sparkline">
    <div className="metric-sparkline-plot">
      <svg className="metric-sparkline-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" role="img" aria-label={description}>
        <path d={area} fill="var(--accent)" fillOpacity=".08" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg className="metric-sparkline-dot" viewBox="0 0 6 6" style={{ left: `${x(rows.length - 1)}%`, top: `${y(last.value)}px` }} aria-hidden="true" focusable="false">
        <circle cx="3" cy="3" r="2" fill="white" stroke="var(--accent)" strokeWidth="2" />
      </svg>
    </div>
    <div className="metric-sparkline-months" aria-hidden="true"><span>{shortMonth(first.month)}</span><span>{shortMonth(last.month)}</span></div>
  </div>
}
