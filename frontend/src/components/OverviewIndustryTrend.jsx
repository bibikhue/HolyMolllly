import { monthLabel, numberLabel } from '../data/visitorDemo'

export default function OverviewIndustryTrend({ rows, industry }) {
  const series = rows.map(row => ({ month: row.month, spending: row.industries.find(item => item.code === industry.code)?.spending ?? null }))
  const available = series.filter(row => row.spending !== null)
  if (!available.length) return <p className="tourism-empty">선택한 업종의 월별 소비 자료가 없습니다.</p>
  const width = 760, height = 245, left = 52, right = 20, top = 18, bottom = 36
  const max = Math.max(100_000_000, Math.ceil(Math.max(...available.map(row => row.spending)) / 1_000_000_000) * 1_000_000_000)
  const x = index => series.length === 1 ? (width + left - right) / 2 : left + index * (width - left - right) / (series.length - 1)
  const y = value => height - bottom - value / max * (height - top - bottom)
  const points = series.map((row, i) => row.spending === null ? null : `${x(i)},${y(row.spending)}`)
  const segments = points.reduce((groups, point) => { if (point === null) groups.push([]); else groups.at(-1).push(point); return groups }, [[]])
  return <svg className="monthly-chart industry-monthly-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${industry.name} 월별 카드 소비 추이. 아래 월별 소비 표에서 정확한 금액을 확인할 수 있습니다.`}>
    {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1={left} x2={width - right} y1={y(max * tick / 4)} y2={y(max * tick / 4)} stroke="#e9eef3" strokeDasharray="3 4" /><text x={left - 10} y={y(max * tick / 4) + 4} textAnchor="end" fill="var(--text-muted)" fontSize="var(--fs-xs)" fontVariantNumeric="tabular-nums">{(max * tick / 4 / 100_000_000).toFixed(0)}</text></g>)}
    {segments.filter(group => group.length).map((group, i) => <polyline key={i} points={group.join(' ')} fill="none" stroke={industry.color || '#1687ca'} strokeWidth="3" strokeLinejoin="round" />)}
    {series.map((row, i) => <g key={row.month}>{row.spending !== null && <circle cx={x(i)} cy={y(row.spending)} r="4" fill="white" stroke={industry.color || '#1687ca'} strokeWidth="2"><title>{monthLabel(row.month)} · {numberLabel(row.spending)}원</title></circle>}{(i % Math.ceil(series.length / 6) === 0 || i === series.length - 1) && <text x={x(i)} y={height - 9} textAnchor="middle" fill="var(--text-muted)" fontSize="var(--fs-xs)" fontVariantNumeric="tabular-nums">{row.month.replace('-', '.')}</text>}</g>)}
  </svg>
}
