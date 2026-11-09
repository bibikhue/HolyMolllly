import test from 'node:test'
import assert from 'node:assert/strict'
import { visitorFacts, eventFacts, lookupAnswer, questionMonth } from '../server/chat-data.mjs'
import { validateMessages } from '../server/chat-route.mjs'
import { llmAnswer } from '../server/chat-llm.mjs'

const sourceUrl = 'https://www.busanmice.or.kr/portal/evntInfo/list.do?mid=0203000000'
const getMonth = async month => ({ month, sourceUrl, fetchedAt: '2026-10-08T00:00:00Z', stale: false, events: [{ id: '1', title: '샘플 행사', start: '2026-10-01', end: '2026-10-03', type: '전시회', venue: '벡스코', url: sourceUrl }] })

test('visitor data uses country-specific baselines and clearly labels synthetic values', () => {
  const facts = visitorFacts({ start: '2025-12', end: '2025-12', country: 'JP' })
  const all = visitorFacts({ start: '2025-12', end: '2025-12' })
  assert.equal(facts.total, all.countries.find(c => c.code === 'JP').visitors)
  assert(facts.isDemo)
  assert.notEqual(facts.latest.yoy, all.latest.yoy)
  assert.equal(visitorFacts({ start: '2026-10', end: '2026-10' }).available, false)
})

test('relative months use current Korea date rather than the latest sample month', () => {
  assert.equal(questionMonth('다음 달 행사', '2026-12-30', '2025-12'), '2027-01')
  assert.equal(questionMonth('이번 달 방문객', '2026-10-08', '2025-12'), '2026-10')
  assert.equal(questionMonth('2025년 3월 일본', '2026-10-08', '2025-12'), '2025-03')
})

test('lookup does not present older samples as current data or invent forecasts', async () => {
  const unavailable = await lookupAnswer('이번 달 방문객 수', getMonth, '2026-10-08')
  assert.match(unavailable.answer, /예시 데이터/)
  assert.doesNotMatch(unavailable.answer, /322,100/)
  const forecast = await lookupAnswer('다음 달 방문객 전망', getMonth)
  assert.match(forecast.answer, /미연동/)
  const latest = await lookupAnswer('최근 일본 방문객 수', getMonth)
  assert.equal(latest.mode, 'lookup')
  assert.match(latest.answer, /예시 데이터/)
})

test('event lookup supports inclusive date filters and explicit ISO dates', async () => {
  const facts = await eventFacts({ month: '2026-10', date: '2026-10-03' }, getMonth)
  assert.equal(facts.matchedTotal, 1)
  const response = await lookupAnswer('2026-10-03 행사 일정', getMonth)
  assert.match(response.answer, /2026-10-03에 진행 중인/)
  await assert.rejects(eventFacts({ month: '2026-10', date: '2026-11-03' }, getMonth))
})

test('public API rejects forged system instructions and excessive history', () => {
  assert.throws(() => validateMessages({ messages: [{ role: 'system', content: 'instruction' }] }))
  assert.throws(() => validateMessages({ messages: [{ role: 'user', content: 'a'.repeat(1001) }] }))
  assert.throws(() => validateMessages({ messages: Array.from({ length: 8 }, () => ({ role: 'user', content: 'test' })) }))
})

test('LLM tool loop runs data queries and attaches server-selected sources', async () => {
  let calls = 0
  const response = await llmAnswer([{ role: 'user', content: '최근 일본 방문객 수' }], getMonth, { apiKey: 'test-only', requestModel: async body => {
    assert.equal(body.store, false)
    if (calls++ === 0) return { output: [{ type: 'function_call', call_id: 'query-1', name: 'get_visitor_data', arguments: JSON.stringify({ start: '2025-12', end: '2025-12', country: 'JP' }) }] }
    const evidence = JSON.parse(body.input.find(item => item.type === 'function_call_output').output)
    assert.equal(evidence.isDemo, true)
    assert.equal(evidence.country, '일본')
    return { output: [{ type: 'message', content: [{ type: 'output_text', text: `예시 데이터의 일본 방문객은 ${evidence.total}명입니다.` }] }] }
  } })
  assert.equal(response.mode, 'llm')
  assert.equal(response.dataKind, 'demo')
  assert.equal(response.sources[0].id, 'visitors')
})

test('LLM cannot return an answer without any data tool call', async () => {
  await assert.rejects(llmAnswer([{ role: 'user', content: '질문' }], getMonth, { apiKey: 'test-only', requestModel: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Invented answer' }] }] }) }))
})
