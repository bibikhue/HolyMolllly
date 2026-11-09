import { useEffect, useRef } from 'react'
import './NotFound.css'

const destinations = [
  ['부산 관광 한눈에', '방문객 수와 소비액, 지역·업종별 현황', '/#/visitors'],
  ['국가별 관광', '국가별 방문객과 소비 특성', '/#/countries'],
  ['관광수요 전망', '향후 방문객 예측과 예측 정확도', '/#/outlook'],
  ['분석 리포트', '기간과 국가를 골라 만드는 요약 보고서', '/#/reports'],
  ['부산 행사 캘린더', '부산에서 열리는 전시·회의 일정', '/#/events'],
  ['프로젝트 소개', '프로젝트의 목적과 데이터 출처', '/#/project'],
]

export default function NotFound({ requestedAddress, onOpenSitemap }) {
  const heading = useRef(null)

  useEffect(() => { heading.current?.focus() }, [])

  return <div className="not-found">
    <div className="not-found-intro">
      <img className="not-found-image" src="/brand/mapsosa-chat-mabi.png" alt="" width="140" height="140" />
      <h1 ref={heading} tabIndex={-1}>찾는 화면이 없습니다</h1>
      <p className="not-found-description">주소가 바뀌었거나 잘못 입력되었을 수 있습니다.</p>
      <p className="not-found-address">요청한 주소: {requestedAddress}</p>
      <div className="not-found-actions">
        <a className="not-found-home" href="/#/">홈으로 가기</a>
        <button type="button" className="not-found-sitemap" onClick={onOpenSitemap}>사이트맵 보기</button>
      </div>
    </div>
    <section className="not-found-suggestions" aria-labelledby="not-found-suggestions-title">
      <h2 id="not-found-suggestions-title">이런 화면을 찾으셨나요?</h2>
      <div className="not-found-grid">
        {destinations.map(([title, description, href]) => <a className="not-found-card" href={href} key={title}>
          <strong>{title}</strong>
          <span>{description}</span>
        </a>)}
      </div>
    </section>
  </div>
}
