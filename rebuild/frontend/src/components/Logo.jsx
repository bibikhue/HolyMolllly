import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import "./Logo.css";
function Logo() {
  const { t } = useTranslation();
  return (
    <div className="logo">
      <Link to="/">
        <img src="/logo.png" alt={t("맙소사 프로젝트 로고")} />
        <div className="logo-text">
          <strong>{t("부산 관광 나침반")}</strong>
          <span>{t("외국인 관광 데이터로 읽는 부산")}</span>
        </div>
      </Link>
    </div>
  );
}

export default Logo;
