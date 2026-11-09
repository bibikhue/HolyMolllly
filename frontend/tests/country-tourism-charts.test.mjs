import test from 'node:test'
import assert from 'node:assert/strict'
import { compactAxisLabel, mobileAxisTicks, niceAxis, seasonCellColors } from '../src/components/countryChartUtils.js'

test('country chart axes use nice intervals and end at the first tick above the data', () => {
  const examples = [1, 37, 100_000 + 1e-8, 104_546, 271_556, 18_920_008_404]
  for (const dataMax of examples) {
    const axis = niceAxis(dataMax)
    assert(axis.max >= dataMax)
    assert.equal(axis.ticks.at(-1), axis.max)
    assert(axis.ticks.length >= 5 && axis.ticks.length <= 7)
    assert(axis.ticks.every((tick, index) => index === 0 || Math.abs(tick - axis.ticks[index - 1] - axis.step) < axis.step * 1e-10))
    const normalized = axis.step / 10 ** Math.floor(Math.log10(axis.step))
    assert([1, 2, 2.5, 5].some(step => Math.abs(step - normalized) < 1e-10))
    const previousTop = axis.max - axis.step
    assert(previousTop < dataMax, `axis ${axis.max} should be the first tick above ${dataMax}`)
  }
  assert.deepEqual(niceAxis(104_546).ticks, [0, 20_000, 40_000, 60_000, 80_000, 100_000, 120_000])
  assert.equal(niceAxis(18_920_008_404).max, 20_000_000_000)
  assert.deepEqual(mobileAxisTicks(niceAxis(104_546).ticks), [0, 60_000, 120_000])
})

test('country chart labels shorten counts and won without rounding away half steps', () => {
  assert.equal(compactAxisLabel(30_000), '3만')
  assert.equal(compactAxisLabel(25_000, 'won'), '2.5만 원')
  assert.equal(compactAxisLabel(100_000, 'won'), '10만 원')
  assert.equal(compactAxisLabel(5_000_000_000, 'spending'), '50억')
  assert.equal(compactAxisLabel(0, 'won'), '0')
})

test('the same blue-white-orange season scale and contrast rule applies to every cell', () => {
  assert.deepEqual(seasonCellColors(100), { fill: '#f8fafc', text: '#000000' })
  assert.equal(seasonCellColors(60).fill, '#16509d')
  assert.equal(seasonCellColors(140).fill, '#ad3d0b')
  assert.equal(seasonCellColors(60).text, '#ffffff')
  assert.equal(seasonCellColors(140).text, '#ffffff')
  assert.equal(seasonCellColors(90).text, '#000000')
  assert.equal(seasonCellColors(110).text, '#000000')
  assert.deepEqual(seasonCellColors(null), { fill: '#e7edf2', text: '#000000' })

  const luminance = hex => {
    const channels = hex.match(/[\da-f]{2}/gi).map(channel => parseInt(channel, 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]
  }
  for (let index = 0; index <= 200; index++) {
    const { fill, text } = seasonCellColors(index)
    const background = luminance(fill)
    const foreground = luminance(text)
    const contrast = (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05)
    assert(contrast >= 4.5, `index ${index} has contrast ratio ${contrast}`)
  }
})
