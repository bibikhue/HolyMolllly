import { useEffect, useId, useRef, useState } from "react";
import "./MonthPicker.css";

export default function MonthPicker({ name, label, years, value = "" }) {
  const id = useId();
  const detailsRef = useRef(null);
  const [selected, setSelected] = useState(value);
  const [viewYear, setViewYear] = useState(null);
  const [selectedYear = "", selectedMonth = ""] = selected.split("-");
  const year = viewYear ?? (Number(selectedYear) || years.at(-1));

  useEffect(() => {
    const closeOutside = (event) => {
      const details = detailsRef.current;
      if (details && !details.contains(event.target)) details.open = false;
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
        detailsRef.current.querySelector("summary").focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectMonth = (nextValue) => {
    setSelected(nextValue);
    detailsRef.current.open = false;
    detailsRef.current.querySelector("summary").focus();
  };

  return (
    <div className="month-picker">
      <span id={id} className="month-picker__label">{label}</span>
      <input type="hidden" name={`${name}_year`} value={selectedYear} />
      <input type="hidden" name={`${name}_month`} value={selectedMonth} />
      <details ref={detailsRef} name="statistics-month-picker">
        <summary aria-labelledby={id}>
          <span className={selected ? "" : "month-picker__placeholder"}>{selected ? `${selectedYear}. ${selectedMonth}` : "연월 선택"}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></svg>
        </summary>
        <div className="month-picker__calendar" role="group" aria-label={`${label} 월 선택`}>
          <div className="month-picker__heading">
            <button type="button" className="month-picker__nav" aria-label={`${label} 이전 연도`} disabled={!year || year <= years[0]} onClick={() => setViewYear(year - 1)}>‹</button>
            <strong>{year ? `${year}년` : "연도 확인 중"}</strong>
            <button type="button" className="month-picker__nav" aria-label={`${label} 다음 연도`} disabled={!year || year >= years.at(-1)} onClick={() => setViewYear(year + 1)}>›</button>
          </div>
          <div className="month-picker__months">
            {Array.from({ length: 12 }, (_, index) => {
              const month = String(index + 1).padStart(2, "0");
              return <button type="button" key={month} className="month-picker__month" disabled={!year} aria-pressed={selected === `${year}-${month}`} onClick={() => selectMonth(`${year}-${month}`)}>{index + 1}월</button>;
            })}
          </div>
          <button type="button" className="month-picker__clear" onClick={() => selectMonth("")}>선택 해제</button>
        </div>
      </details>
    </div>
  );
}
