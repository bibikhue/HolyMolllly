import Subway from "../../components/public_TransPort/Subway";
import "./Stays.css";

function VisitorsStays() {
  return (
    <section className="stays-page">
      <header className="stays-page__intro">
        <p className="stays-page__eyebrow">BUSAN TRANSIT</p>
        <h1>교통이 편리한 숙박시설</h1>
        <p className="stays-page__description">
          노선을 선택해 부산의 지하철과 역 위치를 확인해 보세요.
        </p>
      </header>
      <div className="stays-page__map-card">
        <Subway />
      </div>
    </section>
  );
}

export default VisitorsStays;
