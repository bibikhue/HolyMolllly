function Need() {
  return (
    <section className="about-page__need" aria-labelledby="need-title">
      <div className="about-page__need-inner">
        <span className="about-page__label">02 / 05 · WHY THIS PROJECT</span>
        <h2 id="need-title">배경 및 필요성</h2>
        <div className="about-page__need-grid">
          <ul className="about-page__need-facts">
            <li><strong>242만 명 돌파</strong><span>2026년 상반기 부산 방문 외국인 관광객<br />242만 629명(전년 대비 <b>43.9% 증가</b>)</span></li>
            <li><strong>다양해진 관광 수요</strong><span>체험형 콘텐츠·한 달 살기 등 <b>다양한 여행 수요 발생</b><br />장기 체류를 유도할 콘텐츠와 인프라 조성 필요</span></li>
            <li className="about-page__need-alert"><strong>감소한 자영업자 수</strong><span>최근 4년간 감소한 부산 자영업자 수<br /><b>약 28만 명 수준</b></span></li>
          </ul>
          <svg className="about-page__flow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 5 L10 12 L3 19 M11 5 L18 12 L11 19" /></svg>
          <div className="about-page__need-context">
            <div><h3>성장은 뚜렷하다</h3><p>쇼핑 51%·식음료 18%·여가서비스 12% 등 업종별 관광 소비가 확대되고 있습니다. 부산시는 2028년까지 관광객 500만 명과 관광 지출 1조 5천억 원을 목표로 제시했습니다.</p></div>
            <div><h3>그러나 체감은 다르다</h3><p>해운대·광안리 등 일부 거점과 특정 시기·국적에 수요가 편중되며, “관광객은 늘었는데 소상공인 정책 체감은?”이라는 지적이 이어지고 있습니다.</p></div>
          </div>
          <svg className="about-page__flow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 5 L10 12 L3 19 M11 5 L18 12 L11 19" /></svg>
          <section className="about-page__need-audiences">
            <p><img src="/audience-official.png" alt="" /><span><strong>부산시 관계자</strong>골목 상권 활성화를 위한 <b>예산 배정 우선순위 선정</b>, <b>지역 축제·행사 기획</b>, <b>업종별 소상공인 맞춤 지원</b> 등 정책적 의사결정을 위한 근거가 필요합니다.</span></p>
            <p><img className="about-page__owner-image" src="/audience-small-business.png" alt="" /><span><strong>소상공인</strong>외국인 관광객의 소비 패턴과 행사 알림을 확인하고, 구·군별 연령·성별 방문 및 소비 패턴을 한눈에 볼 수 있게 시각화해 <b>경영과 창업에 도움</b>을 주는 사이트가 필요합니다.</span></p>
            <p><img src="/audience-visitor.png" alt="" /><span><strong>외국인 관광객</strong>체험형 콘텐츠와 한 달 살기처럼 <b>다양한 여행 수요를 고려</b>한 사이트가 필요합니다.</span></p>
          </section>
        </div>
        <p className="about-page__sources">출처: <a href="https://www.busan.go.kr/nbtnewsBU/1745118" target="_blank" rel="noreferrer">부산시 외국인 관광객 현황</a> · <a href="https://kookje.co.kr/news2011/asp/newsbody.asp?code=0200&key=20260903.22001000883" target="_blank" rel="noreferrer">몰려오는 외국 관광객…이제 ‘머물 이유’ 만들어야</a></p>
      </div>
    </section>
  );
}

export default Need;
