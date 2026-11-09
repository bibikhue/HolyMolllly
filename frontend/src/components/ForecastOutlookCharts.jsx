import { compactAxisLabel } from './countryChartUtils.js'
import { niceAxis } from './countryChartUtils.js'
import { monthLabel, numberLabel } from '../data/visitorDemo.js'

const pointString = (rows, x, y, value) => rows.map((row, index) => `${x(index)},${y(row[value])}`).join(' ')
const forecastLabel = value => `${numberLabel(Math.round(value / 1000) * 1000)}명`
const rangeLabel = (row, level) => {
  const lower = forecastLabel(row[`lower_${level}`])
  const upper = forecastLabel(row[`upper_${level}`])
  return lower === upper ? `약 ${lower}` : `${lower}~${upper}`
}

export function ForecastBandChart({ actualRows, forecastRows, color = '#1687ca' }) {
  if (!actualRows.length || !forecastRows.length) return <p>표시할 예측 자료가 없습니다.</p>
  const width = 920, height = 360, left = 62, right = 26, top = 26, bottom = 48
  const axis = niceAxis(Math.max(...actualRows.map(row => row.visitors), ...forecastRows.map(row => row.upper_95)))
  const allMonths = [...actualRows.map(row => row.month), ...forecastRows.map(row => row.target_month)]
  const x = index => left + index / (allMonths.length - 1) * (width - left - right)
  const y = value => height - bottom - value / axis.max * (height - top - bottom)
  const boundary = actualRows.length
  const band = (lower, upper) => {
    const topEdge = forecastRows.map((row, index) => `${x(boundary + index)},${y(row[upper])}`)
    const bottomEdge = forecastRows.map((row, index) => `${x(boundary + index)},${y(row[lower])}`).reverse()
    return `M ${topEdge.join(' L ')} L ${bottomEdge.join(' L ')} Z`
  }
  const actualPoints = pointString(actualRows, x, y, 'visitors')
  const forecastPoints = [
    `${x(boundary - 1)},${y(actualRows.at(-1).visitors)}`,
    ...forecastRows.map((row, index) => `${x(boundary + index)},${y(row.forecast)}`),
  ].join(' ')
  return <div className="outlook-chart-scroll" role="region" aria-label="실제값과 예측 범위 차트 가로 스크롤" tabIndex="0">
    <svg className="outlook-band-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="최근 24개월 실제 방문객과 향후 12개월 예측값, 80% 및 95% 예측 범위. 반올림한 예측값은 아래 표에서 확인할 수 있습니다.">
      {axis.ticks.map(tick => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#e7eef4" /><text x={left - 9} y={y(tick) + 4} textAnchor="end" className="outlook-svg-tick">{compactAxisLabel(tick)}</text></g>)}
      {allMonths.map((month, index) => (index % 3 === 0 || index === allMonths.length - 1) && <text key={month} x={x(index)} y={height - 13} textAnchor="middle" className="outlook-svg-tick">{month.replace('-', '.')}</text>)}
      <line x1={x(boundary - .5)} x2={x(boundary - .5)} y1={top} y2={height - bottom} stroke="#9eb7c7" strokeDasharray="4 5" />
      <path d={band('lower_95', 'upper_95')} fill={color} fillOpacity=".12" />
      <path d={band('lower_80', 'upper_80')} fill={color} fillOpacity=".24" />
      <polyline points={actualPoints} fill="none" stroke="#426276" strokeWidth="2.7" strokeLinejoin="round" />
      <polyline points={forecastPoints} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      {actualRows.map((row, index) => <circle key={row.month} cx={x(index)} cy={y(row.visitors)} r="3" fill="#fff" stroke="#426276" strokeWidth="1.8"><title>{`${monthLabel(row.month)} 실제 ${numberLabel(row.visitors)}명`}</title></circle>)}
      {forecastRows.map((row, index) => <circle key={row.target_month} cx={x(boundary + index)} cy={y(row.forecast)} r="3.5" fill="#fff" stroke={color} strokeWidth="2"><title>{`${monthLabel(row.target_month)} 예측 ${forecastLabel(row.forecast)}, 80% ${rangeLabel(row, 80)}, 95% ${rangeLabel(row, 95)}`}</title></circle>)}
    </svg>
  </div>
}

export function BacktestComparisonChart({ rows, color = '#1687ca' }) {
  if (!rows.length) return <p>선택한 조건의 검증 사례가 없습니다.</p>
  const sorted = [...rows].sort((a, b) => a.target_month.localeCompare(b.target_month))
  const width = 840, height = 300, left = 61, right = 22, top = 22, bottom = 44
  const axis = niceAxis(Math.max(...sorted.flatMap(row => [row.actual, row.forecast])))
  const x = index => left + index / Math.max(1, sorted.length - 1) * (width - left - right)
  const y = value => height - bottom - value / axis.max * (height - top - bottom)
  const every = Math.max(1, Math.ceil(sorted.length / 7))
  return <div className="outlook-chart-scroll" role="region" aria-label="검증 기간 실제값과 예측값 차트 가로 스크롤" tabIndex="0">
    <svg className="outlook-backtest-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="롤링 검증 기간 실제값과 예측값 비교. 실제값과 반올림한 예측값은 아래 목록에서 확인할 수 있습니다.">
      {axis.ticks.map(tick => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#e7eef4" /><text x={left - 9} y={y(tick) + 4} textAnchor="end" className="outlook-svg-tick">{compactAxisLabel(tick)}</text></g>)}
      {sorted.map((row, index) => (index % every === 0 || index === sorted.length - 1) && <text key={row.target_month} x={x(index)} y={height - 13} textAnchor="middle" className="outlook-svg-tick">{row.target_month.replace('-', '.')}</text>)}
      <polyline points={pointString(sorted, x, y, 'actual')} fill="none" stroke="#426276" strokeWidth="2.8" strokeLinejoin="round" />
      <polyline points={pointString(sorted, x, y, 'forecast')} fill="none" stroke={color} strokeWidth="2.8" strokeLinejoin="round" />
      {sorted.map((row, index) => <g key={`${row.origin_month}-${row.target_month}`}>
        <circle cx={x(index)} cy={y(row.actual)} r="3" fill="#fff" stroke="#426276" strokeWidth="1.7"><title>{`${monthLabel(row.target_month)} 실제 ${numberLabel(row.actual)}명`}</title></circle>
        <circle cx={x(index)} cy={y(row.forecast)} r="3" fill="#fff" stroke={color} strokeWidth="1.7"><title>{`${monthLabel(row.target_month)} 예측 ${forecastLabel(row.forecast)}`}</title></circle>
      </g>)}
    </svg>
  </div>
}
