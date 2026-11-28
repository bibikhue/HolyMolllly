import { useTranslation } from "react-i18next";
import { useContext, useEffect, useRef, useState } from "react";
import { sendChatMessage, sendPlanningMessage, sendDataMessage } from "../apis/chatbot";
import LoadingSpinner from "./LoadingSpinner";
import Markdown from "react-markdown";
import remarkCjkFriendly from "remark-cjk-friendly";
import { countChatDatasets } from "./chatDatasets";
import { AnalysisFiltersContext } from "./analysisFilters";
import "./Chatbot.css";

function Chatbot({ graphContext, refreshGraphContext, isAuthenticated, onRequireLogin }) {
  const { t } = useTranslation();
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
  const mode = interpretGraphs ? "chat" : draft.includes("@데이터질문") ? "data" : draft.includes("@행사기획") ? "planning" : chatMode;
  const planningEvent = mode === "planning";
  const dataQuestion = mode === "data";
  const requiresLogin = planningEvent;
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

  const toggleMode = (nextMode, keyword) => {
    const active = nextMode === "chat" ? interpretGraphs : mode === nextMode;
    setChatMode(active ? "chat" : nextMode);
    planningScope.current = null;
    setDraft((previous) => {
      const text = previous.replaceAll("@그래프해석", "").replaceAll("@행사기획", "").replaceAll("@데이터질문", "").trim();
      return active ? text : `${keyword} ${text}`;
    });
    composer.current?.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || request.current) return;
    if (!message.replaceAll("@그래프해석", "").replaceAll("@행사기획", "").replaceAll("@데이터질문", "").trim()) { setError("키워드 뒤에 질문을 입력해 주세요."); return; }
    if (requiresLogin && !isAuthenticated) { setError("행사 기획 상담은 로그인 후 이용해 주세요."); onRequireLogin(); return; }
    if (planningEvent || dataQuestion) {
      setChatMode(mode);
      planningScope.current ??= structuredClone(filters);
    } else if (interpretGraphs) {
      setChatMode("chat");
      planningScope.current = null;
    }
    const controller = new AbortController();
    request.current = controller;
    setSending(true);
    setError("");
    const history = messages.filter((item) => (item.mode ?? "chat") === mode).slice(-24).map(({ role, content }) => ({ role, content }));
    try {
      const context = message.includes("@그래프해석") ? refreshGraphContext() : null;
      const { data } = dataQuestion ? await sendDataMessage(message, history, planningScope.current, controller.signal) : planningEvent ? await sendPlanningMessage(message, history, planningScope.current, controller.signal) : await sendChatMessage(message, history, context, controller.signal);
      if (controller.signal.aborted) return;
      setMessages((previous) => [...previous, { role: "user", content: message, mode }, { role: "assistant", content: data.answer, sources: data.sources, incomplete: data.incomplete, mode }]);
      setDraft("");
    } catch (failure) {
      if (!controller.signal.aborted && requiresLogin && failure.response?.status === 401) onRequireLogin();
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
        <section id="chatbot-panel" className="chatbot-panel" aria-label={t("챗봇")}>
          <div className="chatbot-toolbar">
            <img src="/mapsosa-chat-mabi.png" alt="" />
            <div>
              <p>{t("관광 데이터로 보는 부산")}</p>
              <div className="chatbot-title">
                <strong>{t("홀리모올리")}</strong>
                <span>{t("부산 관광 도우미")}</span>
              </div>
            </div>
            <span className="chatbot-toolbar-actions">
            <button type="button" aria-label={t("채팅 초기화")} title={t("채팅 초기화")} onClick={resetChat}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 10a9 9 0 1 1 2.5 8.3" />
                <path d="M3 4v6h6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={t("챗봇 닫기")}
              onClick={() => setIsOpen(false)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>
            </button>
            </span>
          </div>
          <div className="chatbot-messages" role="log" aria-live="polite">
            {!messages.length && <p className="chatbot-hint">{t("그래프를 함께 참고하려면 @그래프해석을 넣어 주세요.")}</p>}
            {messages.map((message, index) => <div className={`chatbot-message chatbot-message--${message.role}`} key={index}>
              {message.role === "assistant" ? <Markdown remarkPlugins={[remarkCjkFriendly]} skipHtml disallowedElements={["img"]}>{message.sources?.length ? message.content.replace(/\s*\[(?:P|D)\d+\]/g, "") : message.content}</Markdown> : message.content}
              {message.incomplete && <p className="chatbot-error">{t("답변이 완전히 끝나지 않았습니다. 이어서 설명해 달라고 요청해 주세요.")}</p>}
              {message.sources?.length > 0 && <details className="chatbot-sources"><summary>{t("참고 데이터")}</summary><ul>{[...new Set(message.sources.map((source) => source.source || source.title))].map((name) => <li key={name}>{t(name)}</li>)}</ul></details>}
            </div>)}
            {sending && <LoadingSpinner label="답변을 작성하고 있습니다." />}
            {error && <p className="chatbot-error" role="alert">{t(error)}</p>}
            <div ref={end} />
          </div>
          <div className="chatbot-context">
            <button type="button" className="chatbot-interpret" aria-pressed={interpretGraphs} disabled={sending} onClick={() => toggleMode("chat", "@그래프해석")}>{t("그래프 해석")}</button>
            {isAuthenticated && <button type="button" className="chatbot-interpret" aria-pressed={planningEvent} disabled={sending} onClick={() => toggleMode("planning", "@행사기획")}>{t("행사 기획 상담")}</button>}
            <button type="button" className="chatbot-interpret" aria-pressed={dataQuestion} disabled={sending} onClick={() => toggleMode("data", "@데이터질문")}>{t("데이터 질문")}</button>
            {(dataQuestion || (isAuthenticated && planningEvent)) && <span className="chatbot-planning-hint">{dataQuestion ? t("질문 이어가는 중") : t("상담 이어가는 중")}</span>}
            {interpretGraphs && <>
              <span className="chatbot-data-counts" aria-live="polite" title={t("기본·상세 그래프의 해석 자료를 모두 포함합니다.")}>
                {[["visits", "방문"], ["sales", "소비"], ["types", "국가별 특성 유형화"]].filter(([category]) => dataCounts[category].total > 0).map(([category, label]) => t("chartCount", { name: t(label), count: dataCounts[category].total })).join(" · ")}
              </span>
              {(graphContext?.status === "loading" || graphContext?.status === "partial") && <span>{t("일부 데이터 로딩 중")}</span>}
            </>}
          </div>
          <form className="chatbot-composer" onSubmit={submit}>
            <textarea
              ref={composer}
              aria-label={t("메시지")}
              placeholder={dataQuestion ? t("궁금한 관광 데이터나 후속 질문을 입력해주세요") : planningEvent ? t("기획 조건이나 후속 질문을 입력해주세요") : t("메시지를 입력해주세요")}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              disabled={sending}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }}
            />
            <button type="submit" aria-label={t("메시지 보내기")} disabled={sending || !draft.replaceAll("@그래프해석", "").replaceAll("@행사기획", "").replaceAll("@데이터질문", "").trim()}>
              ↑
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className={isOpen ? "chatbot-button chatbot-close" : "chatbot-button"}
        aria-label={isOpen ? t("챗봇 닫기") : t("챗봇 열기")}
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
