import { validateReportOptions, reportEvidence, numericSummary } from './report-data.mjs'
import { llmReport } from './report-llm.mjs'
import { generationLimited, beginGeneration, endGeneration } from './generation-limits.mjs'
import { readJsonBody, sameOrigin } from './api-request.mjs'

export async function handleReports(request, response, url, { getMonth, send }) {
  if (url.pathname === '/api/reports/status' && request.method === 'GET') {
    send(response, 200, { mode: process.env.OPENAI_API_KEY ? 'llm' : 'summary' })
    return true
  }
  if (!url.pathname.startsWith('/api/reports')) return false
  if (url.pathname !== '/api/reports' || request.method !== 'POST') { send(response, 405, { error: '지원하지 않는 리포트 요청입니다.' }); return true }
  if (!sameOrigin(request)) { send(response, 403, { error: '사이트에서 리포트를 생성해 주세요.' }); return true }
  if (!String(request.headers['content-type'] || '').startsWith('application/json')) { send(response, 415, { error: 'JSON 요청이 필요합니다.' }); return true }
  let options
  try { options = validateReportOptions(await readJsonBody(request)) }
  catch { send(response, 400, { error: '조회 기간, 국가와 행사 월을 확인해 주세요.' }); return true }
  if (generationLimited(request)) { send(response, 429, { error: '생성 요청이 많습니다. 잠시 후 다시 시도해 주세요.' }); return true }
  const isLlm = Boolean(process.env.OPENAI_API_KEY)
  beginGeneration(isLlm)
  try {
    const evidence = await reportEvidence(options, getMonth)
    const content = isLlm ? await llmReport(evidence) : numericSummary(evidence)
    send(response, 200, { options, mode: isLlm ? 'llm' : 'summary', generatedAt: new Date().toISOString(), isDemo: true, title: `부산 관광 분석 리포트 · ${evidence.country}`, focus: evidence.focus, content, evidence: { display: evidence.display, supplement: evidence.supplement, events: evidence.events, note: evidence.visitors.note }, sources: evidence.sources })
  } catch {
    // Never silently replace failed LLM output with a template labeled as LLM.
    send(response, 503, { error: '리포트를 생성하지 못했습니다. 데이터 또는 LLM 연결을 확인하고 다시 시도해 주세요.' })
  } finally { endGeneration() }
  return true
}
