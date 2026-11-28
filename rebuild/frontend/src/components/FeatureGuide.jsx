import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./FeatureGuide.css";

export default function FeatureGuide({ title, description, items }) {
  const { t } = useTranslation();
  return <section className="feature-guide">
    <div className="feature-guide__inner">
      <header className="feature-guide__intro"><h1>{t(title)}</h1><p>{t(description)}</p></header>
      <ul className="feature-guide__list">{items.map((item) => {
        const content = <><div><h2>{t(item.title)}</h2><p>{t(item.description)}</p></div><span className="feature-guide__action">{item.to ? <>{t("보기")} <span aria-hidden="true">↗</span></> : t("준비 중")}</span></>;
        return <li key={item.title}>{item.to ? <Link to={item.to}>{content}</Link> : <div className="feature-guide__pending">{content}</div>}</li>;
      })}</ul>
    </div>
  </section>;
}
