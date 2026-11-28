import { createContext, useCallback, useContext } from "react";

export const AnalysisFiltersContext = createContext(null);

export function initialAnalysisFilters() {
  const month = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date());
  const params = new URLSearchParams(window.location.search);
  return { district: "26350", country: "392", month, period: {
    start_ym: params.get("start_ym") || "2018-01", end_ym: params.get("end_ym") || month,
  } };
}

export function useAnalysisFilter(key) {
  const { filters, setFilters } = useContext(AnalysisFiltersContext);
  const setValue = useCallback((value) => setFilters((previous) => {
    const next = typeof value === "function" ? value(previous[key]) : value;
    return JSON.stringify(next) === JSON.stringify(previous[key]) ? previous : { ...previous, [key]: next };
  }), [key, setFilters]);
  return [filters[key], setValue];
}
