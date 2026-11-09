import { useEffect, useRef, useState } from 'react'
import './App.css'
import VisitorOverview from './components/VisitorOverview'
import ProjectIntro from './components/ProjectIntro'
import DashboardHome from './components/DashboardHome'
import DataChatbot from './components/DataChatbot'
import AnalysisReport from './components/AnalysisReport'
import EventCalendarPage from './components/EventCalendarPage'
import CountryTourism from './components/CountryTourism'
import ForecastOutlook from './components/ForecastOutlook'
import NotFound from './components/NotFound'
import { loadTourismOverviewData } from './data/tourismOverviewData'
import { monthLabel } from './data/visitorDemo'
import { formatBuildInfo } from './utils/buildInfo'
import { resolvePage } from './utils/route'

const buildInfoLabel = formatBuildInfo(__BUILD_TIME__, __GIT_HASH__)

const menus = [
  ['부산 관광 한눈에', '핵심 지표 요약', '월별 방문 추이', '지역별 현황', '업종별 소비'],
  ['국가별 관광', '국가 비교', '국가별 상세', '계절성 비교', '언어권별 관심 관광지'],
  ['관광수요 전망', '부산 방문객 전망', '국가별 방문객 전망', '예측 정확도'],
  ['분석 리포트', '자동 리포트', '관광수요 주요 변화', '국가별 수요 특징', '정책·마케팅 시사점'],
  ['부산 행사 캘린더', '부산 행사 캘린더'],
  ['프로젝트 소개', '프로젝트 소개', '분석 범위 안내', '데이터 출처·기준'],
]
const menuDescriptions = {
  '핵심 지표 요약': '최근 한 달 방문객 수와 소비액',
  '월별 방문 추이': '월별 방문객 수의 변화',
  '지역별 현황': '구·군별 방문객과 소비액',
  '업종별 소비': '업종별 소비액과 비중',
  '국가 비교': '국가별 방문객 수와 1인당 소비액',
  '국가별 상세': '국가별 방문 추이와 소비 특성',
  '계절성 비교': '국가별 성수기와 비수기',
  '언어권별 관심 관광지': '언어권별 관광지 검색 순위',
  '부산 방문객 전망': '향후 12개월 방문객 예측',
  '국가별 방문객 전망': '다음 달 국가별 방문객 예측',
  '예측 정확도': '예측값과 실제값의 비교',
  '자동 리포트': '기간과 국가를 골라 만드는 요약 보고서',
  '관광수요 주요 변화': '선택 기간의 주요 변화 요약',
  '국가별 수요 특징': '국가별 수요 규모와 비중',
  '정책·마케팅 시사점': '분석 결과에 따른 대응 방향',
  '프로젝트 소개': '프로젝트의 목적과 메뉴 구성',
  '분석 범위 안내': '제공 범위와 해석 시 유의사항',
  '데이터 출처·기준': '데이터 출처와 용어 설명',
}
const pendingMenus = new Set(['언어권별 관심 관광지'])
const menuPages = ['visitors', 'countries', 'outlook', 'reports', 'events', 'project']
const visitorRoutes = { '핵심 지표 요약': 'kpi', '월별 방문 추이': 'trend', '지역별 현황': 'region', '업종별 소비': 'industry' }
const visitorFocus = hash => { const focus = new URLSearchParams(hash.split('?')[1] || '').get('focus'); return Object.values(visitorRoutes).includes(focus) ? focus : 'kpi' }
const countryRoutes = { '국가 비교': 'compare', '국가별 상세': 'detail', '계절성 비교': 'season', '언어권별 관심 관광지': 'interest' }
const countryFocus = hash => { const focus = new URLSearchParams(hash.split('?')[1] || '').get('focus'); return Object.values(countryRoutes).includes(focus) ? focus : 'compare' }
const countryCode = hash => new URLSearchParams(hash.split('?')[1] || '').get('country')
const outlookRoutes = { '부산 방문객 전망': 'busan', '국가별 방문객 전망': 'countries', '예측 정확도': 'accuracy' }
const outlookFocus = hash => { const focus = new URLSearchParams(hash.split('?')[1] || '').get('focus'); return Object.values(outlookRoutes).includes(focus) ? focus : 'busan' }
const projectRoutes = { '프로젝트 소개': 'about', '분석 범위 안내': 'scope', '데이터 출처·기준': 'data' }
const projectFocus = hash => { const focus = new URLSearchParams(hash.split('?')[1] || '').get('focus'); return Object.values(projectRoutes).includes(focus) ? focus : 'about' }
const reportRoutes = { '자동 리포트': 'overview', '관광수요 주요 변화': 'overview', '국가별 수요 특징': 'markets', '국가별 분석 결과': 'markets', '정책·마케팅 시사점': 'implications' }
const reportFocus = (hash) => new URLSearchParams(hash.split('?')[1] || '').get('focus') || 'overview'
const getPage = () => resolvePage(window.location.pathname, window.location.hash)
const appHashHref = hash => window.location.pathname === '/' || window.location.pathname === '/index.html' ? hash : `/${hash}`
const navigateToAppHash = hash => {
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    window.location.assign(hash)
    return
  }
  window.history.pushState(null, '', `/${hash}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

const printTimeLabel = date => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`
}

const printSelectionLabel = () => {
  const main = document.querySelector('.dashboard-main')
  if (!main) return ''
  const selections = [...main.querySelectorAll('select')].map(select =>
    `${select.getAttribute('aria-label') || '선택값'}: ${select.selectedOptions[0]?.textContent.trim() || select.value}`)
  main.querySelectorAll('.chart-view-toggle').forEach(group => {
    const selected = group.querySelector('[aria-pressed="true"]')
    if (selected) selections.push(`${group.getAttribute('aria-label') || '보기 방식'}: ${selected.textContent.trim()}`)
  })
  main.querySelectorAll('input[type="checkbox"]').forEach(input => {
    const label = input.closest('label')?.textContent.trim()
    if (label) selections.push(`${label}: ${input.checked ? '선택' : '선택 안 함'}`)
  })
  return selections.length ? `선택 조건 · ${selections.join(' · ')}` : ''
}

function Icon({ name }) {
  const paths = {
    chevron: <path d="m5 9 7 7 7-7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    link: <><path d="M10 13a4.5 4.5 0 0 0 6.4 0l2-2A4.5 4.5 0 0 0 12 4.6l-1.2 1.2" /><path d="M14 11a4.5 4.5 0 0 0-6.4 0l-2 2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></>,
    print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6zM17 12h2" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Logo() {
  return <a className="brand" href={appHashHref('#/')} aria-label="팀 맙소사 홈">
    <img className="brand-emblem" src="/brand/mapsosa-emblem-clear.png" alt="" width="64" height="64" />
    <span className="brand-copy"><strong>맙소사</strong><span>데이터로 읽는 부산 관광</span></span>
  </a>
}

function CopyLinkButton({ mobile = false }) {
  const [copied, setCopied] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const resetTimer = useRef(null)
  const manualInput = useRef(null)
  const copyButton = useRef(null)

  useEffect(() => {
    const clearManualUrl = () => setManualUrl('')
    window.addEventListener('hashchange', clearManualUrl)
    return () => {
      window.removeEventListener('hashchange', clearManualUrl)
      window.clearTimeout(resetTimer.current)
    }
  }, [])

  const copyLink = async () => {
    const url = window.location.href
    let success = false
    setManualUrl('')

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url)
        success = true
      } catch { /* Use the selection-based fallback below. */ }
    }

    if (!success) {
      const area = document.createElement('textarea')
      area.value = url
      area.readOnly = true
      area.tabIndex = -1
      Object.assign(area.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', opacity: '0' })
      document.body.appendChild(area)
      try {
        area.focus()
        area.select()
        success = document.execCommand('copy')
      } catch { /* Offer a selected address when copying is blocked. */ }
      finally { area.remove() }
    }

    window.clearTimeout(resetTimer.current)
    if (success) {
      copyButton.current?.focus()
      setCopied(true)
      setAnnouncement('현재 화면 링크를 복사했습니다')
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000)
      return
    }

    setCopied(false)
    setManualUrl(url)
    setAnnouncement('주소가 선택되었습니다. 직접 복사해 주세요')
    requestAnimationFrame(() => {
      manualInput.current?.focus()
      manualInput.current?.select()
    })
  }

  return <span className={`copy-link-control${mobile ? ' copy-link-mobile' : ''}`}>
    <button ref={copyButton} type="button" className="copy-link-button" aria-label={mobile ? copied ? '현재 화면 링크 복사됨' : '현재 화면 링크 복사' : undefined} onClick={copyLink}><Icon name="link" /><span className="copy-link-label">{copied ? '복사됨' : '링크 복사'}</span></button>
    {mobile && copied && <span className="copy-link-feedback" aria-hidden="true">복사됨</span>}
    <span className="copy-link-announcement" aria-live="polite">{announcement}</span>
    {manualUrl && <input className="copy-link-manual" ref={manualInput} aria-label="현재 화면 주소, 직접 복사" value={manualUrl} readOnly onFocus={event => event.target.select()} />}
  </span>
}

function Footer({ onOpen, dataStatus }) {
  return <footer className="site-footer">
    <div className="footer-inner">
      <div className="footer-top">
        <a className="footer-brand" href={appHashHref('#/')} aria-label="팀 맙소사 홈">
          <img className="footer-emblem" src="/brand/mapsosa-emblem-clear.png" alt="" width="44" height="44" />
          <span className="footer-brand-copy"><strong>맙소사</strong><span>데이터로 읽는 부산 관광</span></span>
        </a>
        <nav className="footer-links" aria-label="푸터 메뉴">
          <a href={appHashHref('#/project?focus=about')} onClick={event => { event.preventDefault(); onOpen('프로젝트 소개') }}>프로젝트 소개</a>
          <a href={appHashHref('#/project?focus=scope')} onClick={event => { event.preventDefault(); onOpen('분석 범위 안내') }}>분석 범위 안내</a>
          <a className="footer-data-link" href={appHashHref('#/project?focus=data')} onClick={event => { event.preventDefault(); onOpen('데이터 출처·기준') }}>데이터 출처·기준</a>
          <button onClick={() => onOpen('사이트맵')}>사이트맵</button>
        </nav>
      </div>
      <div className="footer-bottom">
        <p className="footer-copyright">© 2026 팀 맙소사</p>
        <p className="footer-data-note"><span className="footer-data-desktop">방문객·소비 {dataStatus?.isMock ? '예시 자료' : '자료'}{dataStatus?.asOf ? `(기준 ${monthLabel(dataStatus.asOf)})` : '(기준 확인 중)'} · 행사 일정 부산 MICE 플랫폼 · 예측은 참고 정보</span><span className="footer-data-mobile">방문객·소비 {dataStatus?.isMock ? '예시 자료' : '자료'}({dataStatus?.asOf ? monthLabel(dataStatus.asOf) : '기준 확인 중'}) · 부산 MICE · 예측 참고</span></p>
        <p className="footer-build-info">{buildInfoLabel}</p>
        <button className="footer-top-button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>맨 위로 <span aria-hidden="true">↑</span></button>
      </div>
    </div>
  </footer>
}

function App() {
  const [activeMenu, setActiveMenu] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [dataStatus, setDataStatus] = useState(null)
  const [page, setPage] = useState(getPage)
  const [pageHash, setPageHash] = useState(() => window.location.hash)
  const menuButtons = useRef([])
  const navigation = useRef(null)
  const printTitle = useRef(null)
  const printTime = useRef(null)
  const printUrl = useRef(null)
  const printSelections = useRef(null)
  const openedDetails = useRef([])
  useEffect(() => {
    const controller = new AbortController()
    loadTourismOverviewData({ signal: controller.signal }).then(data => {
      setDataStatus({ isMock: data.isMock, asOf: data.asOf })
    }).catch(error => { if (error.name !== 'AbortError') console.error('데이터 상태를 불러오지 못했습니다.', error) })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    document.title = page === 'notFound' ? '화면을 찾을 수 없음 | 맙소사' : page === 'events' ? '부산 행사 캘린더 | 맙소사' : page === 'reports' ? '자동 분석 리포트 | 맙소사' : page === 'project' ? '프로젝트 소개 | 맙소사' : page === 'visitors' ? '부산 관광 한눈에 | 맙소사' : page === 'countries' ? '국가별 관광 | 맙소사' : page === 'outlook' ? '관광수요 전망 | 맙소사' : '맙소사 | 부산 관광 대시보드'
  }, [page])
  useEffect(() => {
    if (page !== 'notFound') return undefined
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [page])
  useEffect(() => {
    const updatePage = () => {
      setPage(getPage())
      setPageHash(window.location.hash)
      setActiveMenu(null)
      setDialog(null)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', updatePage)
    window.addEventListener('popstate', updatePage)
    return () => {
      window.removeEventListener('hashchange', updatePage)
      window.removeEventListener('popstate', updatePage)
    }
  }, [])
  useEffect(() => {
    if (page !== 'notFound') return undefined
    const followAppLink = event => {
      if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return
      const anchor = event.target instanceof Element ? event.target.closest('a[href^="/#/"]') : null
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
      const href = anchor.getAttribute('href')
      event.preventDefault()
      event.stopPropagation()
      navigateToAppHash(href.slice(1))
    }
    document.addEventListener('click', followAppLink, true)
    return () => document.removeEventListener('click', followAppLink, true)
  }, [page])
  useEffect(() => {
    const close = (event) => {
      if (event.key !== 'Escape') return
      if (activeMenu !== null && navigation.current?.contains(document.activeElement)) menuButtons.current[activeMenu]?.focus()
      setActiveMenu(null)
      setDialog(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [activeMenu])
  useEffect(() => {
    const beforePrint = () => {
      const title = document.title
      printTitle.current.textContent = title.startsWith('맙소사 | ') ? title.slice('맙소사 | '.length) : title.replace(/ \| 맙소사$/, '')
      printTime.current.textContent = printTimeLabel(new Date())
      printUrl.current.textContent = window.location.href
      printSelections.current.textContent = printSelectionLabel()
      document.querySelectorAll('.dashboard-main details:not([open])').forEach(detail => {
        openedDetails.current.push(detail)
        detail.open = true
      })
    }
    const afterPrint = () => {
      openedDetails.current.forEach(detail => { detail.open = false })
      openedDetails.current = []
    }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
      afterPrint()
    }
  }, [])
  const openCountryHash = destination => {
    setDialog(null)
    const hash = destination.startsWith('#') ? destination : `#${destination}`
    if (window.location.hash === hash && getPage() !== 'notFound') {
      requestAnimationFrame(() => {
        const section = document.getElementById(`country-${countryFocus(hash)}`)
        section?.scrollIntoView({ block: 'start', behavior: 'instant' })
        section?.focus({ preventScroll: true })
      })
    } else navigateToAppHash(hash)
  }
  const openDialog = (title) => {
    setActiveMenu(null)
    if (title.startsWith('#/countries')) {
      openCountryHash(title)
      return
    }
    if (Object.hasOwn(visitorRoutes, title)) {
      setDialog(null)
      if (getPage() !== 'notFound') setPage('visitors')
      const destination = `/visitors?focus=${visitorRoutes[title]}`
      if (window.location.hash === `#${destination}` && getPage() !== 'notFound') {
        requestAnimationFrame(() => { const section = document.getElementById(`visitor-${visitorRoutes[title]}`); section?.scrollIntoView({ block: 'start', behavior: 'instant' }); section?.focus({ preventScroll: true }) })
      } else navigateToAppHash(`#${destination}`)
      return
    }
    if (Object.hasOwn(countryRoutes, title) || title === '국가별 방문 규모') {
      openCountryHash(`/countries?focus=${countryRoutes[title] || 'compare'}`)
      return
    }
    if (Object.hasOwn(outlookRoutes, title)) {
      setDialog(null)
      const destination = `/outlook?focus=${outlookRoutes[title]}`
      if (window.location.hash === `#${destination}` && getPage() !== 'notFound') {
        requestAnimationFrame(() => { const section = document.getElementById(`outlook-${outlookRoutes[title]}`); section?.scrollIntoView({ block: 'start', behavior: 'instant' }); section?.focus({ preventScroll: true }) })
      } else navigateToAppHash(`#${destination}`)
      return
    }
    if (Object.hasOwn(projectRoutes, title)) {
      setDialog(null)
      const destination = `/project?focus=${projectRoutes[title]}`
      if (window.location.hash === `#${destination}` && getPage() !== 'notFound') {
        requestAnimationFrame(() => { const section = document.getElementById(`project-${projectRoutes[title]}`); section?.scrollIntoView({ block: 'start', behavior: 'instant' }); section?.focus({ preventScroll: true }) })
      } else navigateToAppHash(`#${destination}`)
      return
    }
    if (title === '부산 행사 캘린더') {
      setDialog(null)
      if (getPage() !== 'notFound') setPage('events')
      navigateToAppHash('#/events')
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    if (Object.hasOwn(reportRoutes, title)) {
      setDialog(null)
      if (getPage() !== 'notFound') setPage('reports')
      navigateToAppHash(`#/reports?focus=${reportRoutes[title]}`)
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    if (title === '전체 방문 현황') {
      setDialog(null)
      if (getPage() !== 'notFound') setPage('visitors')
      navigateToAppHash('#/visitors')
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    if (title === '사이트맵') setDialog(title)
  }

  return <>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>본문 바로가기</a>
    <div className="print-header" hidden>
      <div className="print-header-top"><div className="print-brand"><img src="/brand/mapsosa-emblem-clear.png" alt="" width="28" height="28" /><strong>맙소사 · 데이터로 읽는 부산 관광</strong></div><strong ref={printTitle} /></div>
      <p className="print-header-meta">방문객 자료 기준 {dataStatus?.asOf ? monthLabel(dataStatus.asOf) : '확인 중'} · {dataStatus ? dataStatus.isMock ? '예시 자료' : '실제 자료' : '자료 확인 중'} · 출력 <time ref={printTime} /> · <span ref={printUrl} className="print-url" /></p>
      <p className="print-context" ref={printSelections} />
    </div>
    <header className="site-header">
      <div className="header-main">
        <Logo />
        <div className="header-status">
          {dataStatus?.isMock && <span className="status-badge">예시 자료</span>}
          <span className="status-description">방문객 자료 기준 <strong>{dataStatus?.asOf ? monthLabel(dataStatus.asOf) : '확인 중'}</strong></span>
          <a className="status-source" href={appHashHref('#/project?focus=data')} onClick={event => { event.preventDefault(); openDialog('데이터 출처·기준') }}>데이터 출처·기준</a>
          <CopyLinkButton />
          <button className="copy-link-button print-button" type="button" onClick={() => window.print()}><Icon name="print" />인쇄</button>
        </div>
      </div>
      <nav className="main-navigation" aria-label="주 메뉴" ref={navigation}>
          <div className="navigation-inner">
            {menus.map(([title, ...items], index) => {
              const current = page === menuPages[index]
              const expanded = activeMenu === index
              return <div className="navigation-item" key={title}>
                <button ref={element => { menuButtons.current[index] = element }} className={`navigation-button${current ? ' current' : ''}${expanded ? ' active' : ''}`} aria-current={current ? 'page' : undefined} aria-expanded={title === '부산 행사 캘린더' ? undefined : expanded} aria-controls={title === '부산 행사 캘린더' ? undefined : `menu-${index}`} onClick={() => title === '부산 행사 캘린더' ? openDialog(title) : setActiveMenu(expanded ? null : index)}>{title}{title !== '부산 행사 캘린더' && <Icon name="chevron" />}</button>
                {expanded && <div className="dropdown" id={`menu-${index}`}>{items.map(item => <button key={item} onClick={() => openDialog(item)}><span className="dropdown-copy"><strong>{item}</strong><span>{menuDescriptions[item]}</span></span>{pendingMenus.has(item) && <span className="dropdown-pending">준비 중</span>}</button>)}</div>}
              </div>
            })}
          </div>
      </nav>
      <div className="status-mobile-bar">
        <span className="status-mobile"><span>{dataStatus?.isMock ? '미리보기용 수치' : '방문객·소비 수치'} · 기준 {dataStatus?.asOf ? monthLabel(dataStatus.asOf) : '확인 중'} · </span><a href={appHashHref('#/project?focus=data')} onClick={event => { event.preventDefault(); openDialog('데이터 출처·기준') }}>출처 보기</a></span>
        <CopyLinkButton mobile />
      </div>
    </header>
    <main className="dashboard-main" id="main-content" tabIndex={-1} aria-label={page === 'notFound' ? '잘못된 주소 안내' : '대시보드'} onClick={() => setActiveMenu(null)}>
      {page === 'notFound' ? <NotFound key={pageHash} requestedAddress={`${window.location.pathname}${window.location.search}${pageHash}`} onOpenSitemap={() => openDialog('사이트맵')} /> : page === 'events' ? <EventCalendarPage /> : page === 'reports' ? <AnalysisReport key={pageHash} initialFocus={reportFocus(pageHash)} /> : page === 'project' ? <ProjectIntro focus={projectFocus(pageHash)} navigationKey={pageHash} /> : page === 'visitors' ? <VisitorOverview onOpen={openDialog} focus={visitorFocus(pageHash)} navigationKey={pageHash} /> : page === 'countries' ? <CountryTourism focus={countryFocus(pageHash)} country={countryCode(pageHash)} navigationKey={pageHash} onOpen={openDialog} /> : page === 'outlook' ? <ForecastOutlook focus={outlookFocus(pageHash)} navigationKey={pageHash} /> : <DashboardHome onOpen={openDialog} />}
    </main>
    <Footer onOpen={openDialog} dataStatus={dataStatus} />
    <div className="footer-chatbot-space" aria-hidden="true" />
    <DataChatbot />
    {dialog && <div className="modal-backdrop" onClick={() => setDialog(null)}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading"><h1 id="dialog-title">{dialog}</h1><button autoFocus aria-label="닫기" onClick={() => setDialog(null)}><Icon name="close" /></button></div>
        {dialog === '사이트맵' && <div className="sitemap">{menus.map(([title, ...items]) => <div key={title}><h2>{title}</h2>{items.map((item) => <button key={item} onClick={() => openDialog(item)}>{item}</button>)}</div>)}</div>}
      </section>
    </div>}
  </>
}
export default App
