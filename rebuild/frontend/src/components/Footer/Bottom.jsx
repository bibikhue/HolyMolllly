import { useTranslation } from "react-i18next";
function Bottom() {
  const { t } = useTranslation();
  return (
    <div className="footer-bottom">
      <p>{t("Copyright © 2026 팀 맙소사. All rights reserved.")}</p>
      <a href="#top">{t("맨 위로 ↑")}</a>
    </div>
  );
}

export default Bottom;
