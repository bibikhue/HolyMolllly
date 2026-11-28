import FeatureGuide from "../../components/FeatureGuide";
import { PATHS } from "../../constants/paths";

function Visitors() {
  return <FeatureGuide title="관광 안내" description="부산의 교통과 관광 정보를 살펴 여행을 준비합니다." items={[
    { title: "교통이 편리한 숙박시설", description: "지하철 노선과 역 위치를 지도로 확인합니다.", to: PATHS.VISITORS_STAYS },
    { title: "관광지 및 체험형 시설", description: "부산의 지역과 교통 정보를 지도로 살펴봅니다.", to: PATHS.VISITORS_ATTRACTIONS },
    { title: "추천 코스", description: "관심 있는 테마에 맞춰 부산 여행 코스를 찾아봅니다." },
  ]} />;
}

export default Visitors;
