import { lookupAnswer } from './chat-data.mjs'
import { llmAnswer } from './chat-llm.mjs'

import { generationLimited, beginGeneration, endGeneration } from './generation-limits.mjs'
import { readJsonBody, sameOrigin } from './api-request.mjs'

export function validateMessages(payload) {
  if (!payload || !Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > 7) throw new Error('질문 형식을 확인해 주세요.')
  const messages = payload.messages.map((item) => {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || !item.content.trim() || item.content.length > 1000) throw new Error('질문은 1,000자 이내로 입력해 주세요.')
    return { role: item.role, content: item.content.trim() }
  })
  if (messages.at(-1).role !== 'user') throw new Error('마지막 메시지는 질문이어야 합니다.')
  return messages
}

export async function handleChat(request, response, url, { getMonth, send }) {
  if (url.pathname === '/api/chat/status' && request.method === 'GET') {
    send(response, 200, { mode: process.env.OPENAI_API_KEY ? 'llm' : 'lookup', label: process.env.OPENAI_API_KEY ? 'LLM 데이터 답변' : '데이터 조회 모드', available: true })
    return true
  }
  if (!url.pathname.startsWith('/api/chat')) return false
  if (url.pathname !== '/api/chat' || request.method !== 'POST') { send(response, 405, { error: '지원하지 않는 챗봇 요청입니다.' }); return true }
  // Requests are made from this site's own UI. Do not accept cross-site POSTs.
  if (!sameOrigin(request)) { send(response, 403, { error: '사이트에서 질문해 주세요.' }); return true }
  if (!String(request.headers['content-type'] || '').startsWith('application/json')) { send(response, 415, { error: 'JSON 요청이 필요합니다.' }); return true }
  let messages
  try { messages = validateMessages(await readJsonBody(request)) }
  catch { send(response, 400, { error: '질문은 1,000자 이내로 입력해 주세요.' }); return true }
  if (generationLimited(request)) { send(response, 429, { error: '요청이 많습니다. 잠시 후 다시 질문해 주세요.' }); return true }
  beginGeneration(Boolean(process.env.OPENAI_API_KEY))
  try {
    if (process.env.OPENAI_API_KEY) {
      send(response, 200, await llmAnswer(messages, getMonth))
    } else send(response, 200, await lookupAnswer(messages.at(-1).content, getMonth))
  } catch {
    send(response, 503, { error: '답변에 필요한 데이터 또는 LLM 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' })
  } finally { endGeneration() }
  return true
}
