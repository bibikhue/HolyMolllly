import { useState } from "react";
import "./Chatbot.css";

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);

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
            <button
              type="button"
              aria-label="챗봇 닫기"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="chatbot-messages" />
          <div className="chatbot-composer">
            <textarea
              aria-label="메시지"
              placeholder="메시지를 입력해주세요"
              disabled
            />
            <button type="button" aria-label="메시지 보내기" disabled>
              ↑
            </button>
          </div>
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
