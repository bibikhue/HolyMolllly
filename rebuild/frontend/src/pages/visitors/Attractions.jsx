import { useTranslation } from "react-i18next";
import { lazy, Suspense } from "react";
import MapLoading from "../../components/Map/MapLoading.jsx";
import "./Attractions.css";

const Subway = lazy(() => import("../../components/public_TransPort/Subway.jsx"));

function VisitorsAttractions() {
  const { t } = useTranslation();
  return (
    <section className="attractions-page">
      <header className="attractions-page__intro">
        <p className="attractions-page__eyebrow">BUSAN ATTRACTIONS</p>
        <h1>{t("관광지 및 체험형 시설")}</h1>
        <p className="attractions-page__description">{t("지도를 통해 부산의 관광지를 살펴보세요.")}</p>
      </header>
      <div className="attractions-page__map-card">
        <Suspense fallback={<MapLoading />}>
          <Subway />
        </Suspense>
      </div>
    </section>
  );
}

export default VisitorsAttractions;
