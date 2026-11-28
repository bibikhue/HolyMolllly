import { useEffect, useState } from "react";
import { getBusanDistricts } from "../../apis/admin";
import CountryTypeComparison from "./CountryTypeComparison";
import { useAnalysisFilter } from "../../components/analysisFilters";

export default function CountryTypes({ period, view }) {
  const [district, setDistrict] = useAnalysisFilter("district");
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getBusanDistricts(controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setDistricts(data); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.response?.data?.message || "구·군 목록을 불러오지 못했습니다."); });
    return () => controller.abort();
  }, []);

  return <div className="country-types">
    <div hidden={view !== "basic"}><CountryTypeComparison period={period} /></div>
    <div hidden={view !== "detail"}>
      <div className="country-types__filters"><label>구·군<select aria-label="국가별 특성 유형화 구·군" value={district} onChange={(event) => setDistrict(event.target.value)}>
        {districts.length ? districts.map((row) => <option key={row.sgg_cd} value={row.sgg_cd}>{row.sgg_nm}</option>) : <option value="26350">해운대구</option>}
      </select></label></div>
      {error && <p role="alert">{error}</p>}
      <CountryTypeComparison period={period} district={district} />
    </div>
  </div>;
}
