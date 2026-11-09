const NICE_STEPS = [1, 2, 2.5, 5, 10]
const numberFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 })

function nextNiceStep(minimum) {
  const power = 10 ** Math.floor(Math.log10(minimum))
  const normalized = minimum / power
  return (NICE_STEPS.find(step => step >= normalized) ?? 10) * power
}

// Keep four to six even intervals and choose the first attainable top tick above the data.
export function niceAxis(maxValue) {
  const dataMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1
  const candidates = [4, 5, 6].map(intervals => {
    const step = nextNiceStep(dataMax / intervals)
    return { intervals, step, max: step * intervals }
  })
  candidates.sort((a, b) => a.max - b.max || Math.abs(a.intervals - 5) - Math.abs(b.intervals - 5))
  const { intervals, step, max } = candidates[0]
  return {
    max,
    step,
    ticks: Array.from({ length: intervals + 1 }, (_, index) => Number((step * index).toPrecision(12))),
  }
}

export function mobileAxisTicks(ticks) {
  return [ticks[0], ticks[Math.round((ticks.length - 1) / 2)], ticks.at(-1)]
}

export function compactAxisLabel(value, kind = 'count') {
  const absolute = Math.abs(value)
  const compact = absolute >= 100_000_000
    ? `${numberFormat.format(value / 100_000_000)}억`
    : absolute >= 10_000
      ? `${numberFormat.format(value / 10_000)}만`
      : numberFormat.format(value)
  return kind === 'won' && value !== 0 ? `${compact} 원` : compact
}

const NEUTRAL = [248, 250, 252]
const BLUE = [22, 80, 157]
const ORANGE = [173, 61, 11]
const DARK_TEXT = '#000000'
const WHITE_TEXT = '#ffffff'

function luminance(rgb) {
  const [red, green, blue] = rgb.map(channel => {
    const normalized = channel / 255
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4
  })
  return .2126 * red + .7152 * green + .0722 * blue
}

function toHex(rgb) {
  return `#${rgb.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

export function seasonCellColors(value) {
  if (!Number.isFinite(value)) return { fill: '#e7edf2', text: DARK_TEXT }
  const intensity = Math.min(1, Math.abs(value - 100) / 40)
  const target = value < 100 ? BLUE : ORANGE
  const rgb = NEUTRAL.map((channel, index) => channel + (target[index] - channel) * intensity)
  const background = luminance(rgb)
  const dark = 0
  const whiteContrast = 1.05 / (background + .05)
  const darkContrast = (background + .05) / (dark + .05)
  return { fill: toHex(rgb), text: whiteContrast >= darkContrast ? WHITE_TEXT : DARK_TEXT }
}
