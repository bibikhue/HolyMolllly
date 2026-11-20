import { faqCategories, faqItems } from '../data/faqData.js'
import './Faq.css'

export default function Faq() {
  return <section className="faq-page project-content-shell project-detail-section" id="project-faq" tabIndex={-1} aria-labelledby="faq-title">
    <div className="project-section-heading faq-heading">
      <p className="faq-eyebrow">이용 안내</p>
      <h1 id="faq-title">자주 묻는 질문</h1>
      <p className="faq-description">궁금한 질문을 선택하면 답변을 확인할 수 있습니다.</p>
    </div>
    <nav className="faq-category-links" aria-label="FAQ 질문 분류">
      {faqCategories.map(category => <button type="button" key={category.id} onClick={() => {
        const section = document.getElementById(`faq-group-${category.id}`)
        section?.scrollIntoView({ block: 'start', behavior: 'instant' })
        section?.focus({ preventScroll: true })
      }}>{category.label}</button>)}
    </nav>
    {faqCategories.map(category => {
      const items = faqItems.filter(item => item.category === category.id && item.published)
      if (!items.length) return null
      return <section className="faq-group" id={`faq-group-${category.id}`} key={category.id} tabIndex={-1} aria-labelledby={`faq-heading-${category.id}`}>
        <h2 id={`faq-heading-${category.id}`}>{category.title}</h2>
        <div className="faq-list">
          {items.map(item => <details className="faq-item" key={item.id}>
            <summary><span className="faq-question-mark" aria-hidden="true">Q</span><span>{item.question}</span><span className="faq-toggle" aria-hidden="true" /></summary>
            <div className="faq-answer"><p>{item.answer}</p></div>
          </details>)}
        </div>
      </section>
    })}
  </section>
}
