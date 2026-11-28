import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import MonthPicker from "../../components/MonthPicker";
import OwnersVisit from "./Visit";
import OwnersSales from "./Sales";
import "./OwnersLayout.css";
import "./Statistics.css";
import { useAnalysisFilter } from "../../components/analysisFilters";

export default function OwnersStatistics() {
  const [searchParams] = useSearchParams();
  const [metric, setMetric] = useState(() => searchParams.get("metric") === "sales" ? "sales" : "visits");
  const [view, setView] = useState("basic");
  const [currentMonth] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()));
  const [period, setPeriod] = useAnalysisFilter("period");
  const [error, setError] = useState("");
  const years = Array.from({ length: Number(currentMonth.slice(0, 4)) - 2018 + 1 }, (_, index) => 2018 + index);
  const handleSearch = (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const startYear = values.get("owners_start_year");
    const startMonth = values.get("owners_start_month");
    const endYear = values.get("owners_end_year");
    const endMonth = values.get("owners_end_month");
    if (!startYear || !startMonth || !endYear || !endMonth) {
      setError("시작월과 종료월을 선택해 주세요.");
      return;
    }
    const months = (Number(endYear) - Number(startYear)) * 12 + Number(endMonth) - Number(startMonth) + 1;
    if (months < 3) {
      setError("조회 기간은 최소 3개월로 선택해 주세요.");
      return;
    }
    setError("");
    setPeriod({ start_ym: `${startYear}-${startMonth}`, end_ym: `${endYear}-${endMonth}` });
  };
  return (
    <div className="owners-layout owners-statistics" data-chat-context={JSON.stringify({ period, metric, view })}>
      <aside className="owners-statistics__sidebar" aria-label="상권 분석 조회 조건">
        <nav className="owners-statistics__metrics" aria-label="상권 분석 선택">
          <button type="button" aria-pressed={metric === "visits"} onClick={() => setMetric("visits")}>방문</button>
          <button type="button" aria-pressed={metric === "sales"} onClick={() => setMetric("sales")}>소비</button>
        </nav>
        <form className="owners-statistics__period" onSubmit={handleSearch}>
          <h2>공통 조회 기간</h2>
          <MonthPicker key={`start:${period.start_ym}`} name="owners_start" label="시작월" years={years} value={period.start_ym} />
          <MonthPicker key={`end:${period.end_ym}`} name="owners_end" label="종료월" years={years} value={period.end_ym} />
          <button type="submit">조회</button>
          {error && <p role="alert">{error}</p>}
        </form>
      </aside>
      <div className="owners-statistics__content">
        <nav className="owners-statistics__views" aria-label="기본·상세 선택">
          <button type="button" aria-pressed={view === "basic"} onClick={() => setView("basic")}>기본</button>
          <button type="button" aria-pressed={view === "detail"} onClick={() => setView("detail")}>상세</button>
        </nav>
        <div hidden={metric !== "visits"}><OwnersVisit period={period} view={view} /></div>
        <div hidden={metric !== "sales"}><OwnersSales period={period} view={view} /></div>
      </div>
    </div>
  );
}
