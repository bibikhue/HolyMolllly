import test from 'node:test'
import assert from 'node:assert/strict'
import { getLatestPeak, getRecentMonths, getSparklineRange } from '../src/components/sparklineUtils.js'

test('recent trend keeps all available months when fewer than twelve exist', () => {
  const rows = [
    { month: '2025-01', value: 1 },
    { month: '2025-02', value: 2 },
    { month: '2025-03', value: 3 },
  ]
  assert.deepEqual(getRecentMonths(rows, '2025-03'), rows)
  assert.deepEqual(getRecentMonths(rows, '2025-01'), rows.slice(0, 1))
})

test('recent trend ends at the selected middle month and spans at most twelve calendar months', () => {
  const rows = Array.from({ length: 24 }, (_, index) => ({
    month: new Date(Date.UTC(2024, index, 1)).toISOString().slice(0, 7),
    value: index,
  }))
  const selected = getRecentMonths(rows, '2025-06')
  assert.equal(selected.length, 12)
  assert.equal(selected[0].month, '2024-07')
  assert.equal(selected.at(-1).month, '2025-06')
})

test('sparkline range pads the actual minimum and maximum by ten percent', () => {
  assert.deepEqual(getSparklineRange([10, 20, 30]), { min: 8, max: 32 })
})

test('equal values retain a nonzero vertical range', () => {
  assert.deepEqual(getSparklineRange([100, 100, 100]), { min: 90, max: 110 })
  assert.deepEqual(getSparklineRange([0, 0, 0]), { min: -1, max: 1 })
})

test('a tied peak selects the more recent month', () => {
  const rows = [
    { month: '2025-01', value: 20 },
    { month: '2025-02', value: 10 },
    { month: '2025-03', value: 20 },
  ]
  assert.equal(getLatestPeak(rows).month, '2025-03')
  assert.equal(getLatestPeak([...rows].reverse()).month, '2025-03')
})
