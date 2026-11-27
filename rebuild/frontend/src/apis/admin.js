import { adminApi } from "./request.js";

export function getVisitsByCountry(params, signal) {
  return adminApi.get("/countries/visitors", { params, signal });
}

export function getMonthlyVisitsByCountry(params, signal) {
  return adminApi.get("/countries/visitors/monthly", { params, signal });
}

export function getSalesByCountry(params, signal) {
  return adminApi.get("/countries/sales", { params, signal });
}

export function getMonthlySalesByCountry(params, signal) {
  return adminApi.get("/countries/sales/monthly", { params, signal });
}

export function getSalesPerVisitorDistribution(params, signal) {
  return adminApi.get("/countries/sales-per-visitor/distribution", { params, signal });
}

export function getMonthlySalesPerVisitor(params, signal) {
  return adminApi.get("/countries/sales-per-visitor/monthly", { params, signal });
}

export function getCountryDistrictVisits(params, signal) {
  return adminApi.get("/countries/visitors/sigungu", { params, signal });
}

export function getBusanDistricts(signal) {
  return adminApi.get("/sigungu", { params: { sido_cd: "26" }, signal });
}

export function getCountryDistrictIndustrySales(params, signal) {
  return adminApi.get("/industries/sales", { params, signal });
}

export function getAgeDistrictVisits(params, signal) {
  return adminApi.get("/ages/visitors/sigungu", { params, signal });
}
