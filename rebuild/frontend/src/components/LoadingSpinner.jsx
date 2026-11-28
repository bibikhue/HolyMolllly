import "./LoadingSpinner.css";

export default function LoadingSpinner({ label = "데이터를 불러오는 중입니다." }) {
  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <span className="loading-spinner__ring" aria-hidden="true" />
      <span className="loading-spinner__label">{label}</span>
    </div>
  );
}
