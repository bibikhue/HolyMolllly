import { useEffect, useRef, useState } from 'react'
import './DataChatbot.css'

const welcome = { id: 'welcome', role: 'assistant', content: '안녕하세요! 부산 바다에서 온 홀리모올리예요.\n궁금한 관광 데이터를 함께 찾아볼까요?', sources: [] }
const suggestions = ['최근 일본 방문객 수', '이번 달 행사가 가장 많은 날', '다음 달 행사 일정']

function Mabi({ className = '' }) {
  return <img className={`chat-mabi ${className}`} src="/brand/mapsosa-chat-mabi.png" alt="파란 스카프를 두른 갈매기 홀리모올리" />
}

function ChatIcon({ close = false }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{close ? <path d="m6 6 12 12M6 18 18 6" /> : <><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3H3V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" /></>}</svg>
}

export default function DataChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([welcome])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(null)
  const [error, setError] = useState('')
  const input = useRef(null)
  const log = useRef(null)
  const launcher = useRef(null)
  const controller = useRef(null)
  const nextId = useRef(0)

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const request = new AbortController()
    fetch('/api/chat/status', { signal: request.signal }).then(response => {
      if (!response.ok) throw new Error('status')
      return response.json()
    }).then(data => setMode(data.mode)).catch(() => {})
    return () => request.abort()
  }, [open])
  useEffect(() => { if (open && log.current) log.current.scrollTop = log.current.scrollHeight }, [messages, busy, error, open])
  useEffect(() => () => controller.current?.abort(), [])

  const close = () => { setOpen(false); launcher.current?.focus() }
  const send = async (question = draft) => {
    const text = question.trim()
    if (!text || busy || text.length > 1000) return
    const history = messages.filter(message => message.id !== 'welcome').slice(-6).map(message => ({ role: message.role, content: message.content.slice(0, 1000) }))
    setMessages(previous => [...previous, { id: `chat-${++nextId.current}`, role: 'user', content: text }])
    setDraft(''); setError(''); setBusy(true)
    controller.current = new AbortController()
    const timeout = setTimeout(() => controller.current.abort(), 145_000)
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...history, { role: 'user', content: text }] }), signal: controller.current.signal })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '답변을 받지 못했습니다.')
      setMode(payload.mode)
      setMessages(previous => [...previous, { id: `chat-${++nextId.current}`, role: 'assistant', content: payload.answer, sources: payload.sources || [], dataKind: payload.dataKind }])
    } catch (failure) {
      setError(failure.name === 'AbortError' ? '응답 시간이 길어지고 있습니다. 잠시 후 다시 시도해 주세요.' : failure.message)
      setDraft(text)
    } finally { clearTimeout(timeout); setBusy(false); input.current?.focus() }
  }

  return <aside className="data-chatbot" aria-label="관광 데이터 챗봇">
    {open && <section className="chat-panel" role="dialog" aria-modal="false" id="chat-panel" aria-labelledby="chat-title" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
      <header className="chat-header"><span className="chat-avatar"><Mabi /></span><div><p>관광 데이터로 보는 부산</p><h2 id="chat-title">홀리모올리 <span>관광 데이터 도우미</span></h2></div><button onClick={close} aria-label="챗봇 닫기"><ChatIcon close /></button></header>
      <div className="chat-mode"><span className={mode === 'llm' ? 'llm' : ''} />{mode === 'llm' ? 'LLM 데이터 답변' : mode === 'lookup' ? '데이터 조회 모드 · LLM 연결 전' : '연결 상태 확인 중'}</div>
      <div className="chat-messages" ref={log} role="log" aria-live="polite" aria-relevant="additions text" tabIndex="0">
        {messages.length === 1 && <div className="chat-welcome"><div className="chat-welcome-art"><span className="chat-spark spark-one">✦</span><Mabi /><span className="chat-spark spark-two">✧</span></div><span className="chat-welcome-tag">부산을 읽는 작은 탐험가</span></div>}
        {messages.map(message => <article className={`chat-message ${message.role}`} key={message.id} aria-label={message.role === 'user' ? '내 질문' : '도우미 답변'}>{message.role === 'assistant' && <span className="chat-message-name">홀리모올리 · 데이터 도우미</span>}<p>{message.content}</p>{message.sources?.length > 0 && <div className="chat-sources"><span>조회한 자료</span>{message.sources.map(source => <a key={source.id} href={source.url} target={source.url.startsWith('https://') ? '_blank' : undefined} rel={source.url.startsWith('https://') ? 'noopener noreferrer' : undefined}>{source.kind === 'demo' ? '예시 · ' : ''}{source.label} ↗</a>)}</div>}</article>)}
        {busy && <div className="chat-thinking" role="status"><span /><span /><span />홀리모올리가 자료를 찾고 있어요</div>}
        {error && <p className="chat-error" role="alert">{error}</p>}
      </div>
      {messages.length === 1 && <div className="chat-suggestions">{suggestions.map(question => <button key={question} disabled={busy} onClick={() => send(question)}>{question}<span aria-hidden="true">↗</span></button>)}</div>}
      <p className="chat-data-note">방문객은 예시 자료, 행사는 공식 일정 기준입니다.</p>
      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); send() }}><label className="visually-hidden" htmlFor="chat-question">데이터 질문</label><textarea id="chat-question" ref={input} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="홀리모올리에게 궁금한 점을 물어보세요" maxLength={1000} rows={2} disabled={busy} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() } }} /><button type="submit" disabled={!draft.trim() || busy} aria-label="질문 보내기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6" /></svg></button></form>
    </section>}
    <button className={`chat-launcher ${open ? 'open' : ''}`} ref={launcher} onClick={() => open ? close() : setOpen(true)} aria-expanded={open} aria-controls={open ? 'chat-panel' : undefined} aria-label={open ? '챗봇 접기' : '관광 데이터 챗봇 열기'}>{open ? <ChatIcon close /> : <span className="chat-launcher-mascot" aria-hidden="true"><Mabi /></span>}</button>
  </aside>
}
