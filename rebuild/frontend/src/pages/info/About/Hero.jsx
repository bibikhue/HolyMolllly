import { Link } from "react-router-dom";
import { PATHS } from "../../../constants/paths";

function Hero() {
  return (
    <header className="about-page__hero">
      <div className="about-page__hero-content">
        <p className="about-page__eyebrow">01 / 05 · BUSAN TOURISM INSIGHTS</p>
        <h1>부산을 읽고,<br />관광의 내일을 보다.</h1>
        <p>외국인 관광의 흐름을 데이터로 살펴봅니다.<br />부산 관광의 변화와 가능성을 만나보세요.</p>
        <Link className="about-page__button" to={PATHS.HOME}>대시보드 살펴보기 <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="about-page__hero-bottom">
        <span>부산, 바다와 도시가 만나는 곳</span>
        <span className="about-page__credit">팀 맙소사 · 관광 데이터 분석</span>
      </div>
    </header>
  );
}

export default Hero;
