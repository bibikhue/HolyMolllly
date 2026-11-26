function Features() {
  return (
    <section className="about-page__features" aria-labelledby="features-title">
      <span className="about-page__label">03 / 05 · SERVICE</span>
      <h2 id="features-title">핵심 기능과 활용 방안</h2>
      <p>서비스 대상에 맞춰 필요한 분석과 정보를 제공합니다.</p>
      <div className="about-page__feature-list">
        <article>
          <h3>부산시 관계자</h3>
          <div><strong>핵심 기능</strong><ul><li>국가별 관광 수요 파악 및 예측</li><li>국가별 관광 패턴 분석 및 유형화</li><li>관광 수요의 계절성 및 변동성 분석</li><li>축제·행사 기획 등 의사결정 지원</li></ul></div>
          <div><strong>활용 방안</strong><ul><li>국가별 맞춤 정책 결정</li><li>상권과 관광 유형에 따른 정책 수립</li><li>구·군별 소비금액을 통한 소상공인 지원 정책 수립</li></ul></div>
        </article>
        <article>
          <h3>소상공인</h3>
          <div><strong>핵심 기능</strong><ul><li>국가·업종·구·군별 소비 패턴 분석</li><li>외지인 소비 패턴 분석</li><li>외지인·외국인 소비 패턴 변화</li><li>주간 행사 일정 알림</li></ul></div>
          <div><strong>활용 방안</strong><ul><li>시기별 맞춤 전략 설정</li><li>창업 시 상권 분석</li><li>주간 행사에 따른 계획 수립</li></ul></div>
        </article>
        <article>
          <h3>외국인 관광객</h3>
          <div><strong>핵심 기능</strong><ul><li>교통이 편리한 숙박시설 정보</li><li>체험형 관광 콘텐츠 및 관광지 정보</li><li>일정별 관광지 바로보기</li><li>맞춤형 관광 플랜 제공</li></ul></div>
          <div><strong>활용 방안</strong><ul><li>다양한 테마별 관광 추천</li><li>맞춤형 관광 제공을 통한 만족도 향상</li><li>편리한 방문 경험을 통한 재방문 유도</li></ul></div>
        </article>
      </div>
      <p className="about-page__feature-outcome">서비스 대상을 고려한 맞춤형 기능으로 <strong>골목 상권 활성화</strong>를 돕습니다.</p>
    </section>
  );
}

export default Features;
