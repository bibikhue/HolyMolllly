import assert from 'node:assert/strict'
import test from 'node:test'
import { formatBuildInfo } from '../src/utils/buildInfo.js'

test('UTC late night advances to the next Korean calendar day', () => {
  assert.equal(formatBuildInfo('2026-10-12T23:30:00.000Z', 'a1b2c3d'), '업데이트 2026.10.13 08:30 · a1b2c3d')
})

test('local revision is shown when Git is unavailable', () => {
  assert.equal(formatBuildInfo('2026-10-13T00:20:00.000Z', 'local'), '업데이트 2026.10.13 09:20 · local')
})

test('invalid build time produces a readable fallback', () => {
  assert.equal(formatBuildInfo('invalid', 'a1b2c3d'), '업데이트 시각 확인 불가 · a1b2c3d')
  assert.equal(formatBuildInfo(undefined, ''), '업데이트 시각 확인 불가 · local')
})
