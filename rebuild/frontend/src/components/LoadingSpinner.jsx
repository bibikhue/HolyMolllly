import "./LoadingSpinner.css";
import { useTranslation } from "react-i18next";

export default function LoadingSpinner({ label = "데이터를 불러오는 중입니다." }) {
  const { t } = useTranslation();
  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <span className="loading-spinner__ring" aria-hidden="true" />
      <span className="loading-spinner__label">{t(label)}</span>
    </div>
  );
}
