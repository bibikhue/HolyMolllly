import FeatureGuide from "../../components/FeatureGuide";
import { PATHS } from "../../constants/paths";

function Admin() {
  return <FeatureGuide title="관광 정책 지원" description="국가별 방문과 소비 특성을 비교해 관광 정책의 방향을 살펴봅니다." items={[
    { title: "국가별 방문 및 소비", description: "국가별 방문 비중과 소비 규모, 월별 변화를 비교합니다.", to: PATHS.ADMIN_COUNTRIES },
    { title: "국가별 특성 유형화", description: "방문 계절과 성장률, 소비 특성이 비슷한 국가들을 살펴봅니다.", to: `${PATHS.ADMIN_COUNTRIES}?metric=types` },
    { title: "분석 리포트", description: "관광 데이터의 주요 흐름을 정리한 리포트를 제공합니다.", to: PATHS.ADMIN_REPORT },
    { title: "국가별 예상 관광객 수", description: "조건 변화에 따른 관광 수요를 시뮬레이션합니다.", to: PATHS.ADMIN_FORECAST },
  ]} />;
}

export default Admin;
