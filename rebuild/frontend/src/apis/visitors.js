import { publicApi } from "./request.js";

// 로그인 없이 조회하는 관광지 목록 API 샘플
export function getAttractions(params) {
  return publicApi.get("/visitors/attractions", { params });
}
