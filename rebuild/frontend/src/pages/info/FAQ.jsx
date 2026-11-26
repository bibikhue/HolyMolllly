import { useState } from "react";
import { FAQ_CATEGORIES } from "../../constants/faq.js";
import "./FAQ.css";

function FAQ() {
  const [category, setCategory] = useState(FAQ_CATEGORIES[0].id);
  const [openQuestion, setOpenQuestion] = useState(null);
  const sections = FAQ_CATEGORIES.find(({ id }) => id === category).sections;

  return (
    <article className="faq-page">
      <header className="faq-page__header">
        <span className="faq-page__eyebrow">서비스 이용 안내</span>
        <h1>주요 질문 및 답변</h1>
      </header>

      <div className="faq-page__categories" aria-label="질문 대상">
        {FAQ_CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={
              category === id
                ? "faq-page__category is-active"
                : "faq-page__category"
            }
            aria-pressed={category === id}
            onClick={() => {
              setCategory(id);
              setOpenQuestion(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {sections.length > 0 ? (
        sections.map(({ id, title, questions }) => (
          <section className="faq-page__section" key={id}>
            <h2>{title}</h2>
            <div className="faq-page__list">
              {questions.map(({ id: questionId, question, answer }) => {
                const itemId = `${id}-${questionId}`;
                const isOpen = openQuestion === itemId;

                return (
                  <div className="faq-page__item" key={itemId}>
                    <button
                      type="button"
                      className="faq-page__question"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${itemId}`}
                      onClick={() => setOpenQuestion(isOpen ? null : itemId)}
                    >
                      <span className="faq-page__q">Q</span>
                      <span>{question}</span>
                      <span className="faq-page__toggle" aria-hidden="true">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    <p id={`faq-answer-${itemId}`} hidden={!isOpen}>{answer}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <p className="faq-page__empty">등록된 질문이 없습니다.</p>
      )}
    </article>
  );
}

export default FAQ;
