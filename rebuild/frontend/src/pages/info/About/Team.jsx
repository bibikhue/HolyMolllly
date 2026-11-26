function Team() {
  return (
    <section className="about-page__team" aria-labelledby="team-title">
      <div>
        <span className="about-page__label">04 / 05 · ABOUT THE TEAM</span>
        <h2 id="team-title">팀 소개</h2>
        <h3>감탄을 자아내는 인사이트, 팀 맙소사</h3>
        <p>
          팀명 ‘맙소사’는 프로젝트의 최종 결과물을 마주하는 누구에게나 절로
          감탄이 터져 나올 만큼, 깊이 있는 완성도를 보여주겠다는 팀원들의 확고한
          결의와 도전 의식을 담고 있습니다.
        </p>
        <div className="about-page__values">
          <span>수요패턴 정밀 진단</span>
          <span>임팩트 있는 가치</span>
          <span>놀라운 통찰</span>
        </div>
      </div>
      <div className="about-page__team-logo">
        <img src="/logo-transparent.png" alt="팀 맙소사 로고" />
      </div>
    </section>
  );
}

export default Team;
