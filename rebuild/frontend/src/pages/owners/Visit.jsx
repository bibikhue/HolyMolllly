import { useTranslation } from "react-i18next";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useEffect, useState } from "react";
import { getBusanDistricts } from "../../apis/admin";
import { getVisitPatterns } from "../../apis/owners";
import DonutChart from "../../components/DonutChart";
import ComparisonBarChart from "../../components/ComparisonBarChart";
import RegionVisitorComparison from "./RegionVisitorComparison";
import "./Visit.css";
import { useAnalysisFilter } from "../../components/analysisFilters";
import { useChatDataset } from "../../components/chatDatasets";

const AGE_COLORS = ["#e88b42", "#f6ae73", "#369664", "#82c890", "#337fb5", "#76b5d8", "#8971b9", "#bdb6dc"];
const AUDIENCES = [
  { key: "내국인", name: "내국인", color: "#1f4e79" },
  { key: "영어권", name: "영어권", color: "#589ed6" },
  { key: "일본어", name: "일본", color: "#70ad47" },
  { key: "중간체", name: "중국", color: "#ed7d31" },
  { key: "중번체", name: "대만", color: "#8064a2" },
];

export default function OwnersVisit({ period, view }) {
  const { t } = useTranslation();
  const [districtCode, setDistrictCode] = useAnalysisFilter("district");
  const [districts, setDistricts] = useState([]);
  const [districtError, setDistrictError] = useState("");
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const requestKey = districtCode + ":" + period.start_ym + ":" + period.end_ym;
  const error = failure?.key === requestKey ? failure.message : "";
  const loading = !error && result?.requestKey !== requestKey;
  useChatDataset("owners-visit-detail", { period, district: districtCode, status: error ? "error" : loading ? "loading" : "ready", data: !loading && !error ? result : null });

  useEffect(() => {
    const controller = new AbortController();
    getBusanDistricts(controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setDistricts(data);
    }).catch((error) => {
      if (!controller.signal.aborted) setDistrictError(error.response?.data?.message || "구·군 목록을 불러오지 못했습니다.");
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getVisitPatterns({ ...period, sgg_cd: districtCode }, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setResult({ ...data, requestKey }); })
      .catch((error) => {
        if (!controller.signal.aborted) setFailure({ key: requestKey, message: error.response?.data?.message || "방문 패턴을 불러오지 못했습니다." });
      });
    return () => controller.abort();
  }, [period, districtCode, requestKey]);

  const demographicRows = result?.demographics ?? [];
  const ageLabels = [...new Set(demographicRows.map((row) => row.age_group))];
  const ageData = ageLabels.map((age, index) => ({
    label: age, value: demographicRows.filter((row) => row.age_group === age).reduce((sum, row) => sum + Number(row.visitor_cnt), 0), color: AGE_COLORS[index],
  }));
  const genderSeries = [{ name: "남성", color: "#3e80b2" }, { name: "여성", color: "#e77c62" }].map((gender) => ({
    ...gender, values: ageLabels.map((age) => Number(demographicRows.find((row) => row.age_group === age && row.gender === gender.name)?.visitor_cnt ?? 0)),
  }));
  const attractions = result?.attractions ?? [];
  const interestSeries = AUDIENCES.map((audience) => ({ ...audience, values: attractions.map((item) => Number(item.counts[audience.key] ?? 0)) }));

  return (
    <div className="owners-visits">
      <div hidden={view !== "basic"}>
        <RegionVisitorComparison start={period.start_ym} end={period.end_ym} />
      </div>
      <div hidden={view !== "detail"}>
        <label className="owners-visits__district owners-visits__district-filter">{t("구·군")}<select name="sgg_cd" value={districtCode} onChange={(event) => setDistrictCode(event.target.value)} aria-label="분석 구·군">
            {districts.length ? districts.map((item) => <option key={t(item.sgg_cd)} value={t(item.sgg_cd)}>{t(item.sgg_nm)}</option>) : <option value="26440">{t("강서구")}</option>}
          </select>
        </label>
        {(error || districtError) && <p className="owners-visits__error" role="alert">{error || districtError}</p>}
        {loading && <LoadingSpinner label="방문 패턴을 불러오는 중입니다." />}
      {result && <div aria-busy={loading}>
        <div className="owners-visits__overview">
          <div className="owners-visits__age">
            <DonutChart title={`${result.sgg_nm} 외지인 연령대별 방문 비율`} data={ageData} centerLabel="누적 외지인 방문" centerValue={null}
              chartSize={280} legend="bottom" showLegendValues={false} percentDigits={1} minLabelPercent={2} showDataTable={false} unit="건" />
          </div>
          <ComparisonBarChart title={`${result.sgg_nm} 성별·연령별 누적 방문객 수`} labels={ageLabels} series={genderSeries} height={300} />
        </div>
        <div className="owners-visits__interests">
          <ComparisonBarChart title={`${result.sgg_nm} 언어권별 관심 관광지 (합산 상위 10곳)`} labels={attractions.map((item) => item.content_nm)} series={interestSeries} horizontal height={650} />
        </div>
      </div>}
      </div>
    </div>
  );
}
