import { useTranslation } from "react-i18next";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useEffect, useState } from "react";
import { getBusanDistricts, getCountryDistrictIndustrySales } from "../../apis/admin";
import DonutChart from "../../components/DonutChart";
import { useAnalysisFilter } from "../../components/analysisFilters";
import { useChatDataset } from "../../components/chatDatasets";

const INDUSTRY_COLORS = {
  쇼핑업: "#1f4e79", 여가서비스업: "#2f75b5", 식음료업: "#5b9bd5",
  숙박업: "#70ad47", 의료웰니스업: "#ed7d31", 운송업: "#ffc000", 여행업: "#a5a5a5",
};
// This API's source unit is 천원, unlike country_tourism_spending.
const formatEok = (value) => (value / 100000).toLocaleString("ko-KR", { maximumFractionDigits: 2 });

function IndustryChart({ country, district, start, end }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const countryCode = country.country_cd;
  const districtCode = district.sgg_cd;
  const requestKey = `${countryCode}:${districtCode}:${start}:${end}`;
  useChatDataset(`policy-industry-${districtCode}`, { period: { start_ym: start, end_ym: end }, country: countryCode, district: districtCode, unit: "천원", status: error ? "error" : result?.requestKey === requestKey ? "ready" : "loading", data: result?.requestKey === requestKey ? result : null });

  useEffect(() => {
    const controller = new AbortController();
    getCountryDistrictIndustrySales({ country_cd: countryCode, sgg_cd: districtCode, start_ym: start, end_ym: end }, controller.signal)
      .then(({ data }) => {
        if (!Array.isArray(data.data)) throw new Error("업종별 소비 통계 응답을 확인할 수 없습니다.");
        if (!controller.signal.aborted) setResult({ ...data, requestKey });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.response?.data?.message || "업종별 소비 통계를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [countryCode, districtCode, start, end, requestKey]);

  if (error) return <p role="alert">{error}</p>;
  if (!result) return <LoadingSpinner label="업종별 소비 통계를 불러오는 중입니다." />;

  const data = result.data.map((row) => ({
    label: row.industry_nm, value: Number(row.sales_amt), color: INDUSTRY_COLORS[row.industry_nm],
  })).filter((item) => Number.isFinite(item.value) && item.value > 0);

  return (
    <>
      <DonutChart
        title={`${country.country_nm} ${district.sgg_nm} 업종별 간편결제 관광소비 비중`}
        data={data} centerValue={district.sgg_nm} chartSize={280} legendWidth={180} hole={0.42}
        showLabels minLabelPercent={3} percentDigits={1}
        unit="억원" formatValue={formatEok} legendTitle="업종별 소비금액" showDataTable={false}
      />
    </>
  );
}

export default function CountryIndustrySpend({ country, start, end }) {
  const { t } = useTranslation();
  const [districts, setDistricts] = useState(null);
  const [error, setError] = useState("");
  const [sharedDistrict, setSharedDistrict] = useAnalysisFilter("district");
  const [districtCodes, setDistrictCodes] = useState(() => [sharedDistrict, sharedDistrict === "26110" ? "26350" : "26110"]);

  useEffect(() => {
    const controller = new AbortController();
    getBusanDistricts(controller.signal)
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("구군 목록을 확인할 수 없습니다.");
        if (!controller.signal.aborted) setDistricts(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("구군 목록을 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, []);

  const firstCode = districtCodes.includes(sharedDistrict) ? districtCodes[0] : sharedDistrict;
  const firstDistrict = districts?.find((item) => String(item.sgg_cd) === firstCode) ?? districts?.[0];
  const secondDistrict = districts?.find((item) => String(item.sgg_cd) === districtCodes[1] && item !== firstDistrict)
    ?? districts?.find((item) => item !== firstDistrict);
  const selectedDistricts = [firstDistrict, secondDistrict];

  return (
    <div className="country-industry-comparison">
      {error ? <p role="alert">{error}</p> : !districts ? <LoadingSpinner label="구군 목록을 불러오는 중입니다." /> : country && firstDistrict && secondDistrict ? selectedDistricts.map((district, index) => (
        <div className="admin-visits__card" key={index}>
          <div className="admin-visits__chart-controls">
            <label className="admin-visits__country-select">{t("구·군")}<select aria-label={`${index + 1}번째 비교 구·군`} value={String(district.sgg_cd)} onChange={(event) => {
                const code = event.target.value;
                if (code === String(selectedDistricts[1 - index].sgg_cd)) return;
                setDistrictCodes(selectedDistricts.map((item, position) => position === index ? code : String(item.sgg_cd)));
                setSharedDistrict(code);
              }}>
                {districts.filter((item) => String(item.sgg_cd) !== String(selectedDistricts[1 - index].sgg_cd))
                  .map((item) => <option key={t(item.sgg_cd)} value={String(item.sgg_cd)}>{t(item.sgg_nm)}</option>)}
              </select>
            </label>
          </div>
          <IndustryChart key={`${country.country_cd}:${district.sgg_cd}:${start}:${end}`} country={country} district={district} start={start} end={end} />
        </div>
      )) : <p>비교할 국가 또는 구군이 없습니다.</p>}
    </div>
  );
}
