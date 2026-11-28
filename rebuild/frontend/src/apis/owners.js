import { publicApi } from "./request";

export function getVisitPatterns(params, signal) {
  return publicApi.get("/sigungu/visit-patterns", { params, signal });
}

export function getRegionVisitorComparison(params, signal) {
  return publicApi.get("/sigungu/visitor-comparison", { params, signal });
}

export function getSalesOverview(params, signal) {
  return publicApi.get("/industries/sales/overview", { params, signal });
}

export function getSalesPatterns(params, signal) {
  return publicApi.get("/industries/sales/patterns", { params, signal });
}

export function getPerVisitorCountries(params, signal) {
  return publicApi.get("/countries/sales-per-visitor", { params, signal });
}

export function getCountryClusters(params, signal) {
  return publicApi.get("/countries/clusters", { params, signal });
}
