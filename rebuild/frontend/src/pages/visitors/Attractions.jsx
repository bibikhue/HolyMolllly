import Subway from "../../components/public_TransPort/Subway";
import "./Attractions.css";

function VisitorsAttractions() {
  return (
    <section className="attractions-page">
      <header className="attractions-page__intro">
        <p className="attractions-page__eyebrow">BUSAN ATTRACTIONS</p>
        <h1>관광지 및 체험형 시설</h1>
        <p className="attractions-page__description">
          지도를 통해 부산의 관광지를 살펴보세요.
        </p>
      </header>
      <div className="attractions-page__map-card">
        <Subway />
      </div>
    </section>
  );
}

export default VisitorsAttractions;
