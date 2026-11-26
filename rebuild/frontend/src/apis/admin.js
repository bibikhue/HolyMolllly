import { adminApi } from "./request.js";

// 관리자 인증이 필요한 국가별 방문 통계 API 샘플
export function getVisitsByCountry(params) {
  return adminApi.get("/admin/visits", { params });
}
