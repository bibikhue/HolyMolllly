import { useTranslation } from "react-i18next";
import "./DataSources.css";

function DataSources() {
  const { t } = useTranslation();
  return (
    <article className="sources-page">
      <h1>{t("데이터 출처·기준")}</h1>
      <p className="sources-page__intro">{t("데이터를 해석할 때 출처와 집계 기준을 함께 확인해 주세요.")}</p>
      <section><h2>{t("화면별 데이터")}</h2><p>{t("구체적인 출처와 집계 기준은 각 화면의 안내를 확인해 주세요.")}</p></section>
      <section><h2>{t("전체 목록 및 갱신 주기")}</h2><p>{t("확인 필요")}</p></section>
    </article>
  );
}

export default DataSources;
