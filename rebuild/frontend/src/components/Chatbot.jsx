import { useContext, useEffect, useRef, useState } from "react";
import { sendChatMessage, sendPlanningMessage } from "../apis/chatbot";
import LoadingSpinner from "./LoadingSpinner";
import Markdown from "react-markdown";
import remarkCjkFriendly from "remark-cjk-friendly";
import { countChatDatasets } from "./chatDatasets";
import { AnalysisFiltersContext } from "./analysisFilters";
import "./Chatbot.css";

function Chatbot({ graphContext, refreshGraphContext, isAuthenticated, onRequireLogin }) {
  const { filters } = useContext(AnalysisFiltersContext);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatMode, setChatMode] = useState("chat");
  const planningScope = useRef(null);
  const request = useRef(null);
  const end = useRef(null);
  const composer = useRef(null);
  const interpretGraphs = draft.includes("@그래프해석");
  const planningEvent = draft.includes("@행사기획") || (chatMode === "planning" && !interpretGraphs);
  const dataCounts = countChatDatasets(graphContext);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages, sending, isOpen]);

  const resetChat = () => {
    request.current?.abort();
    request.current = null;
    setMessages([]);
    setDraft("");
    setError("");
    setSending(false);
    setChatMode("chat");
    planningScope.current = null;
  };

  const submit = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || request.current) return;
    if (!message.replaceAll("@그래프해석", "").replaceAll("@행사기획", "").trim()) { setError("키워드 뒤에 질문을 입력해 주세요."); return; }
    if (planningEvent && !isAuthenticated) { setError("행사 기획 상담은 로그인 후 이용해 주세요."); onRequireLogin(); return; }
    if (planningEvent) {
      setChatMode("planning");
      planningScope.current ??= structuredClone(filters);
    } else if (interpretGraphs) {
      setChatMode("chat");
      planningScope.current = null;
    }
    const controller = new AbortController();
    request.current = controller;
    setSending(true);
    setError("");
    const history = messages.slice(-24).map(({ role, content }) => ({ role, content }));
    try {
      const context = message.includes("@그래프해석") ? refreshGraphContext() : null;
      const { data } = planningEvent ? await sendPlanningMessage(message, history, planningScope.current, controller.signal) : await sendChatMessage(message, history, context, controller.signal);
      if (controller.signal.aborted) return;
      setMessages((previous) => [...previous, { role: "user", content: message }, { role: "assistant", content: data.answer, sources: data.sources, incomplete: data.incomplete }]);
      setDraft("");
    } catch (failure) {
      if (!controller.signal.aborted && planningEvent && failure.response?.status === 401) onRequireLogin();
      if (!controller.signal.aborted) setError(failure.response?.data?.message || "답변을 받지 못했습니다. 다시 시도해 주세요.");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setSending(false);
      }
    }
  };

  return (
    <>
      {isOpen && (
        <section id="chatbot-panel" className="chatbot-panel" aria-label="챗봇">
          <div className="chatbot-toolbar">
            <img src="/mapsosa-chat-mabi.png" alt="" />
            <div>
              <p>관광 데이터로 보는 부산</p>
              <div className="chatbot-title">
                <strong>홀리모올리</strong>
                <span>부산 관광 도우미</span>
              </div>
            </div>
            <span className="chatbot-toolbar-actions">
            <button type="button" aria-label="채팅 초기화" title="채팅 초기화" onClick={resetChat}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 10a9 9 0 1 1 2.5 8.3" />
                <path d="M3 4v6h6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="챗봇 닫기"
              onClick={() => setIsOpen(false)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>
            </button>
            </span>
          </div>
          <div className="chatbot-messages" role="log" aria-live="polite">
            {!messages.length && <p className="chatbot-hint">그래프를 함께 참고하려면 @그래프해석을 넣어 주세요.</p>}
            {messages.map((message, index) => <div className={`chatbot-message chatbot-message--${message.role}`} key={index}>
              {message.role === "assistant" ? <Markdown remarkPlugins={[remarkCjkFriendly]} skipHtml disallowedElements={["img"]}>{message.sources?.length ? message.content.replace(/\s*\[(?:P|D)\d+\]/g, "") : message.content}</Markdown> : message.content}
              {message.incomplete && <p className="chatbot-error">답변이 완전히 끝나지 않았습니다. 이어서 설명해 달라고 요청해 주세요.</p>}
              {message.sources?.length > 0 && <details className="chatbot-sources"><summary>참고 데이터</summary><ul>{[...new Set(message.sources.map((source) => source.source || source.title))].map((name) => <li key={name}>{name}</li>)}</ul></details>}
            </div>)}
            {sending && <LoadingSpinner label="답변을 작성하고 있습니다." />}
            {error && <p className="chatbot-error" role="alert">{error}</p>}
            <div ref={end} />
          </div>
          <div className="chatbot-context">
            <button type="button" className="chatbot-interpret" aria-pressed={interpretGraphs} disabled={sending} onClick={() => { setChatMode("chat"); planningScope.current = null; setDraft((previous) => previous.includes("@그래프해석") ? previous.replaceAll("@그래프해석", "").trim() : `@그래프해석 ${previous.replaceAll("@행사기획", "").trim()}`); composer.current?.focus(); }}>그래프 해석</button>
            {isAuthenticated && <button type="button" className="chatbot-interpret" aria-pressed={planningEvent} disabled={sending} onClick={() => { setChatMode(planningEvent ? "chat" : "planning"); planningScope.current = null; setDraft((previous) => planningEvent ? previous.replaceAll("@행사기획", "").trim() : `@행사기획 ${previous.replaceAll("@그래프해석", "").trim()}`); composer.current?.focus(); }}>행사 기획 상담</button>}
            {isAuthenticated && planningEvent && <span className="chatbot-planning-hint">상담 이어가는 중</span>}
            {interpretGraphs && <>
              <span className="chatbot-data-counts" aria-live="polite" title="기본·상세 그래프의 해석 자료를 모두 포함합니다.">
                {[["visits", "방문"], ["sales", "소비"], ["types", "국가별 특성 유형화"]].filter(([category]) => dataCounts[category].total > 0).map(([category, label]) => `${label} ${dataCounts[category].total}건`).join(" · ")}
              </span>
              {(graphContext?.status === "loading" || graphContext?.status === "partial") && <span>일부 데이터 로딩 중</span>}
            </>}
          </div>
          <form className="chatbot-composer" onSubmit={submit}>
            <textarea
              ref={composer}
              aria-label="메시지"
              placeholder={planningEvent ? "기획 조건이나 후속 질문을 입력해주세요" : "메시지를 입력해주세요"}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              disabled={sending}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }}
            />
            <button type="submit" aria-label="메시지 보내기" disabled={sending || !draft.replaceAll("@그래프해석", "").replaceAll("@행사기획", "").trim()}>
              ↑
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className={isOpen ? "chatbot-button chatbot-close" : "chatbot-button"}
        aria-label={isOpen ? "챗봇 닫기" : "챗봇 열기"}
        aria-expanded={isOpen}
        aria-controls="chatbot-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        {!isOpen && <img src="/mapsosa-chat-mabi.png" alt="" />}
      </button>
    </>
  );
}

export default Chatbot;
