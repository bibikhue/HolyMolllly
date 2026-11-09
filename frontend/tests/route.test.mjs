import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePage } from '../src/utils/route.js'

// Distinct addresses used by menu actions, dropdowns, the sitemap, footer,
// and internal page links in App.jsx, components, and projectInfo.js.
const knownHashes = [
  '', '#', '#/',
  '#/visitors',
  '#/visitors?focus=kpi',
  '#/visitors?focus=trend',
  '#/visitors?focus=region',
  '#/visitors?focus=industry',
  '#/countries',
  '#/countries?focus=compare',
  '#/countries?focus=detail',
  '#/countries?focus=detail&country=JP',
  '#/countries?focus=season',
  '#/countries?focus=interest',
  '#/outlook',
  '#/outlook?focus=busan',
  '#/outlook?focus=countries',
  '#/outlook?focus=accuracy',
  '#/reports',
  '#/reports?focus=overview',
  '#/reports?focus=markets',
  '#/reports?focus=implications',
  '#/events',
  '#/project',
  '#/project?focus=about',
  '#/project?focus=scope',
  '#/project?focus=data',
]

test('all known local addresses resolve to an existing page', () => {
  assert.equal(new Set(knownHashes).size, knownHashes.length)
  for (const hash of knownHashes) {
    assert.notEqual(resolvePage('/', hash), 'notFound', hash || '(empty hash)')
    assert.notEqual(resolvePage('/index.html', hash), 'notFound', hash || '(empty hash)')
  }
})

test('known page paths resolve exactly, independent of focus query', () => {
  assert.equal(resolvePage('/', ''), 'dashboard')
  assert.equal(resolvePage('/', '#'), 'dashboard')
  assert.equal(resolvePage('/', '#/'), 'dashboard')
  for (const page of ['visitors', 'countries', 'outlook', 'reports', 'events', 'project']) {
    assert.equal(resolvePage('/', `#/${page}`), page)
  }
  assert.equal(resolvePage('/', '#/visitors?focus=abc'), 'visitors')
})

test('unknown hashes and paths resolve to notFound', () => {
  for (const [pathname, hash] of [
    ['/', '#/outlok'],
    ['/', '#/reportsabc'],
    ['/', '#/visitors/extra'],
    ['/outlook', ''],
    ['/abc', '#/visitors'],
  ]) {
    assert.equal(resolvePage(pathname, hash), 'notFound', `${pathname}${hash}`)
  }
})
