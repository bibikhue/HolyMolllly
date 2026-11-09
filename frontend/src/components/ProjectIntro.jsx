import { useEffect } from 'react'
import {
  projectAbout,
  projectMenuGuide,
  projectPrinciples,
  projectScope,
  projectSections,
  projectSources,
  projectTerms,
} from '../data/projectInfo.js'
import './ProjectIntro.css'

const validFocus = value => projectSections.some(section => section.id === value) ? value : 'about'

function ProjectTabs({ activeFocus }) {
  return <nav className="project-section-nav" aria-label="프로젝트 소개 하위 메뉴">
    {projectSections.map(section => <a key={section.id} href={'#/project?focus=' + section.id} aria-current={activeFocus === section.id ? 'location' : undefined}>{section.label}</a>)}
  </nav>
}

function AboutSection() {
  return <section className="project-about-section" id="project-about" tabIndex={-1} aria-labelledby="project-about-title">
    <div className="busan-hero" aria-labelledby="project-hero-title">
      <div className="hero-content">
        <p className="hero-eyebrow"><span /> {projectAbout.heroEyebrow}</p>
        <h1 id="project-hero-title">{projectAbout.heroTitleLines.map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
        <p className="hero-description">{projectAbout.heroDescriptionLines.map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</p>
        <a className="hero-button" href="#/visitors">부산 관광 한눈에 <span aria-hidden="true">↗</span></a>
      </div>
      <div className="hero-bottom">
        <span className="hero-location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>{projectAbout.heroLocation}</span>
        <span className="hero-signature">{projectAbout.heroSignature}</span>
      </div>
    </div>
    <div className="project-about" aria-labelledby="project-about-title">
      <div className="project-about-heading"><h2 id="project-about-title">{projectAbout.introTitleLines.map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2></div>
      <div className="project-about-copy">{projectAbout.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className="project-about-actions"><a href="#/project?focus=scope">분석 범위 안내 <span aria-hidden="true">↗</span></a><a href="#/project?focus=data">데이터 출처·기준 <span aria-hidden="true">↗</span></a></div></div>
    </div>
    <div className="project-content-shell project-menu-guide">
      <div className="project-section-heading"><h2>메뉴 안내</h2></div>
      <div className="project-table-region" role="region" aria-label="메뉴 안내 표 가로 스크롤" tabIndex={0}>
        <table className="project-table project-menu-table"><thead><tr><th scope="col">메뉴</th><th scope="col">답하는 질문</th><th scope="col">현재 자료 상태</th></tr></thead><tbody>{projectMenuGuide.map(item => <tr key={item.label}><th scope="row"><a href={item.href}>{item.label} <span aria-hidden="true">↗</span></a></th><td>{item.question}</td><td>{item.status}</td></tr>)}</tbody></table>
      </div>
    </div>
  </section>
}

function ScopeSection() {
  return <section className="project-content-shell project-detail-section" id="project-scope" tabIndex={-1} aria-labelledby="project-scope-title">
    <div className="project-section-heading"><h1 id="project-scope-title">분석 범위 안내</h1></div>
    <div className="project-scope-grid">
      <div className="project-info-card"><h2>지금 보여주는 것</h2><ul>{projectScope.current.map(item => <li key={item}>{item}</li>)}</ul></div>
      <div className="project-info-card"><h2>아직 준비 중인 것</h2><ul>{projectScope.pending.map(item => <li key={item}>{item}</li>)}</ul></div>
      <div className="project-info-card project-caution-card"><h2>해석할 때 주의할 점</h2><ul>{projectScope.cautions.map(item => <li key={item}>{item}</li>)}</ul></div>
    </div>
  </section>
}

function DataSection() {
  return <section className="project-content-shell project-detail-section" id="project-data" tabIndex={-1} aria-labelledby="project-data-title">
    <div className="project-section-heading"><h1 id="project-data-title">데이터 출처·기준</h1></div>
    <div className="project-info-card">
      <h2>자료 출처와 현재 상태</h2>
      <div className="project-table-region" role="region" aria-label="데이터 출처 표 가로 스크롤" tabIndex={0}>
        <table className="project-table project-sources-table"><thead><tr><th scope="col">출처</th><th scope="col">자료</th><th scope="col">1차 확인 기간</th><th scope="col">쓰이는 메뉴</th><th scope="col">현재 상태</th></tr></thead><tbody>{projectSources.map(item => <tr key={item.source}><th scope="row">{item.source}</th><td>{item.data}</td><td>{item.period}</td><td>{item.usedIn}</td><td>{item.status}</td></tr>)}</tbody></table>
      </div>
      <ul className="project-principles">{projectPrinciples.map(principle => <li key={principle}>{principle}</li>)}</ul>
    </div>
    <div className="project-info-card project-terms-card"><h2>용어와 집계 기준</h2><dl>{projectTerms.map(item => <div key={item.term}><dt>{item.term}</dt><dd>{item.description}</dd></div>)}</dl></div>
  </section>
}

export default function ProjectIntro({ focus = 'about', navigationKey }) {
  const activeFocus = validFocus(focus)
  useEffect(() => {
    document.getElementById('project-' + activeFocus)?.focus({ preventScroll: true })
  }, [activeFocus, navigationKey])

  return <div className="project-intro-page">
    <div className="project-nav-shell"><ProjectTabs activeFocus={activeFocus} /></div>
    {activeFocus === 'about' && <AboutSection />}
    {activeFocus === 'scope' && <ScopeSection />}
    {activeFocus === 'data' && <DataSection />}
  </div>
}
