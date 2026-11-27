import "./MapLoading.css";

export default function MapLoading() {
  return (
    <div className="map-loading" role="status" aria-live="polite">
      지도를 불러오는 중입니다.
    </div>
  );
}
