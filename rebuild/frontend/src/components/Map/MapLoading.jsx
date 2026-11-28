import "./MapLoading.css";
import LoadingSpinner from "../LoadingSpinner";

export default function MapLoading() {
  return (
    <div className="map-loading">
      <LoadingSpinner label="지도를 불러오는 중입니다." />
    </div>
  );
}
