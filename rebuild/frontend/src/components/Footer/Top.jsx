import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "../Logo";
import { FOOTER_LIST, RELATED_SITES } from "../../constants/navigation";

function Top() {
  const { t } = useTranslation();
  return (
    <div className="footer-top">
      <Logo />
      <nav className="footer-links" aria-label={t("사이트 안내")}>
        <ul>
          {FOOTER_LIST.map(({ name, link }) => (
            <li key={link}>
              <Link to={link}>{t(name)}</Link>
            </li>
          ))}
          <li>
            <details className="footer-sites">
              <summary>{t("관련 사이트")}</summary>
              <ul>
                {RELATED_SITES.map(({ name, link }) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noopener noreferrer">{t(name)} ↗</a>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Top;
