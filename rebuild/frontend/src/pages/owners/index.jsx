import FeatureGuide from "../../components/FeatureGuide";
import { PATHS } from "../../constants/paths";

function Owners() {
  return <FeatureGuide title="상권 분석 지원" description="지역별 방문객과 소비 흐름을 살펴 상권 운영에 필요한 정보를 확인합니다." items={[
    { title: "방문 패턴 분석", description: "구·군별 방문 규모와 연령·성별 구성, 언어권별 관심 관광지를 살펴봅니다.", to: PATHS.OWNERS_PATTERNS },
    { title: "소비 패턴 분석", description: "구·군별 소비 규모와 업종 구성, 국가별 월간 소비 흐름을 비교합니다.", to: `${PATHS.OWNERS_PATTERNS}?metric=sales` },
    { title: "주간 행사 알림", description: "관심 있는 부산 행사 소식을 원하는 요일에 이메일로 받아봅니다." },
  ]} />;
}

export default Owners;
