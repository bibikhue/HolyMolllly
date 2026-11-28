import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n";

export default function LanguageSelect() {
  const { i18n } = useTranslation();
  return <label className="header-language"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></svg><select aria-label="Language / 언어" value={i18n.resolvedLanguage} onChange={(event) => i18n.changeLanguage(event.target.value)}>{LANGUAGES.map(({ code, name }) => <option lang={code} value={code} key={code}>{name}</option>)}</select></label>;
}
