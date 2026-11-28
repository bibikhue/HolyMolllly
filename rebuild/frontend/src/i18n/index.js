import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { messages } from "./messages";

export const LANGUAGES = [{ code: "ko", name: "한국어" }, { code: "en", name: "English" }, { code: "ja", name: "日本語" }, { code: "zh-CN", name: "简体中文" }, { code: "zh-TW", name: "繁體中文" }];
let language = "ko";
try { const saved = localStorage.getItem("mapsosa-language"); if (LANGUAGES.some(({ code }) => code === saved)) language = saved; } catch { /* Storage can be disabled. */ }
const resources = Object.fromEntries(LANGUAGES.map(({ code }, index) => [code, { translation: Object.fromEntries(messages.map(([key, ...values]) => [key, index === 0 ? key : values[index - 1]])) }]));
Object.assign(resources.ko.translation, { monthYear: "{{year}}년 {{month}}월", monthNumber: "{{month}}월", horizonMonths: "{{count}}개월 뒤", modelName: "{{name}} 모델", chartCount: "{{name}} {{count}}건", comparisonTitle: "{{name}} 관광객 수 비교", previousYear: "{{label}} 이전 연도", nextYear: "{{label}} 다음 연도", selectMonth: "{{label}} 월 선택" });
Object.assign(resources.ko.translation, { visitLeaderSummary: "국가별 방문은 {{country}}이 {{share}}로 가장 큰 비중을 차지합니다.", salesLeaderSummary: "국가별 소비는 {{country}}이 {{share}}로 가장 큰 비중을 차지합니다." });
const forecastKey = "국가별 예상 관광객 수\n(시뮬레이션)";
for (const { code } of LANGUAGES) resources[code].translation[forecastKey] = ({ ko: forecastKey, en: "Visitor Forecast\n(Simulation)", ja: "国別観光客予測\n（シミュレーション）", "zh-CN": "各国游客预测\n（模拟）", "zh-TW": "各國旅客預測\n（模擬）" })[code];
i18n.use(initReactI18next).init({ resources, lng: language, supportedLngs: LANGUAGES.map(({ code }) => code), fallbackLng: "ko", keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false } });
const updateLanguage = (code) => { document.documentElement.lang = code; document.title = `${i18n.t("부산 관광 나침반")} | ${i18n.t("관광 안내")}`; try { localStorage.setItem("mapsosa-language", code); } catch { /* Keep the in-memory selection. */ } };
i18n.on("languageChanged", updateLanguage);
updateLanguage(language);
export default i18n;
