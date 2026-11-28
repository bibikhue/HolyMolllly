import { useTranslation } from "react-i18next";
import { useState } from "react";
import "./OwnersLayout.css";
import "./WeeklyEvents.css";

const TYPES = [
  { name: "축제·행사", color: "#368bc1" }, { name: "공연·전시", color: "#61a584" },
  { name: "스포츠", color: "#9a85bf" }, { name: "기타", color: "#d8ad55" },
];
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const dateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function Icon({ name }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8m-4-4h8" /></>,
    bell: <><path d="m3 3 18 18M6 6a6 6 0 0 0 0 6c0 5-3 5-3 5h14M10 4a6 6 0 0 1 8 6v3M10 21h4" /></>,
    send: <><path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function WeeklyEvents() {
  const { t, i18n } = useTranslation();
  const weekdayLabel = (day) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: "short" }).format(new Date(2023, 0, 1 + ["일", "월", "화", "수", "목", "금", "토"].indexOf(day)));
  const [today] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date()));
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(() => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + 6);
    return dateString(date);
  });
  const [ongoing, setOngoing] = useState(true);
  const [types, setTypes] = useState(["축제·행사", "공연·전시"]);
  const [days, setDays] = useState(["월"]);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const toggle = (value, values, setter) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const moveMonth = (offset) => setMonth(dateString(new Date(year, monthNumber - 1 + offset, 1)).slice(0, 7));

  return (
    <div className="weekly-events-layout owners-layout">
    <section className="weekly-events" aria-labelledby="weekly-events-title">
      <div className="weekly-events__schedule weekly-events__panel">
        <header className="weekly-events__intro">
          <div className="weekly-events__heading"><Icon name="calendar" /><h1 id="weekly-events-title">{t("주간 행사 일정 알림")}</h1></div>
          <p>{t("관심 있는 부산 행사 소식을 원하는 요일에 이메일로 받아보세요.")}</p>
        </header>
        <fieldset className="weekly-events__period">
          <legend>{t("알림 기간")}</legend>
          <div className="weekly-events__date-row">
            <label><span>{t("시작일")}</span><input aria-label={t("알림 시작일")} type="date" value={start} required onChange={(event) => { setStart(event.target.value); if (event.target.value) setMonth(event.target.value.slice(0, 7)); }} /></label>
            <span className="weekly-events__date-divider">~</span>
            <label><span>{t("종료일")}</span><input aria-label={t("알림 종료일")} type="date" value={end} min={start} required disabled={ongoing} onChange={(event) => setEnd(event.target.value)} /></label>
          </div>
          <label className="weekly-events__check weekly-events__ongoing"><input type="checkbox" checked={ongoing} onChange={(event) => setOngoing(event.target.checked)} />{t("종료일 없이 계속 받기")}</label>
          {!ongoing && start > end && <p role="alert">{t("종료일은 시작일 이후로 선택해 주세요.")}</p>}
        </fieldset>
        <fieldset className="weekly-events__types">
          <legend>{t("행사 유형")}</legend>
          <div>{TYPES.map((type) => <label className="weekly-events__check" key={type.name}><input type="checkbox" checked={types.includes(type.name)} onChange={() => toggle(type.name, types, setTypes)} />{t(type.name)}</label>)}</div>
        </fieldset>
        <div className="weekly-events__calendar" aria-label={t("알림 기간 달력")}>
          <div className="weekly-events__month"><button type="button" aria-label={t("이전 달")} onClick={() => moveMonth(-1)}>‹</button><h2>{t("monthYear", { year, month: monthNumber })}</h2><button type="button" aria-label={t("다음 달")} onClick={() => moveMonth(1)}>›</button></div>
          <div className="weekly-events__calendar-grid">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => <span className={`weekly-events__weekday ${index === 0 ? "is-sunday" : index === 6 ? "is-saturday" : ""}`} key={day}>{weekdayLabel(day)}</span>)}
            {Array.from({ length: cellCount }, (_, index) => {
              const day = index - firstWeekday + 1;
              if (day < 1 || day > daysInMonth) return <span key={index} />;
              const date = `${month}-${String(day).padStart(2, "0")}`;
              const inPeriod = !!start && date >= start && (ongoing || (!!end && date <= end));
              return <button key={index} type="button" aria-label={new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: "full" }).format(new Date(year, monthNumber - 1, day))} aria-pressed={date === selectedDate} aria-current={date === today ? "date" : undefined}
                className={`${index % 7 === 0 ? "is-sunday" : index % 7 === 6 ? "is-saturday" : ""} ${inPeriod ? "is-in-period" : ""} ${date === selectedDate ? "is-selected" : ""}`}
                onClick={() => setSelectedDate(date)}>{day}{date === today && <span className="weekly-events__today-dot" />}</button>;
            })}
          </div>
          <div className="weekly-events__legend">{TYPES.map((type) => <span key={type.name}><i style={{ backgroundColor: type.color }} />{t(type.name)}</span>)}</div>
          <p className="weekly-events__calendar-note">{t("행사 일정 연동을 준비 중입니다. 달력의 배경은 선택한 알림 기간입니다.")}</p>
        </div>
      </div>
      <div className="weekly-events__settings">
        <div className="weekly-events__delivery">
          <fieldset className="weekly-events__panel"><legend className="weekly-events__sr-only">{t("발송 요일")}</legend>
            <div className="weekly-events__heading"><Icon name="calendar" /><h2>{t("발송 요일")}</h2></div>
            <div className="weekly-events__days">{WEEKDAYS.map((day) => <label className="weekly-events__check" key={day}><input type="checkbox" checked={days.includes(day)} onChange={() => toggle(day, days, setDays)} />{weekdayLabel(day)}</label>)}</div>
          </fieldset>
          <div className="weekly-events__panel"><div className="weekly-events__heading"><Icon name="clock" /><h2>{t("발송 시간")}</h2></div>
            <select aria-label={t("발송 시간")} defaultValue="09:00">{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={`${String(hour).padStart(2, "0")}:00`}>{String(hour).padStart(2, "0")}:00</option>)}</select>
            <p className="weekly-events__subtle">{t("한국 시간 기준")}</p>
          </div>
        </div>
        <div className="weekly-events__panel weekly-events__email"><div className="weekly-events__heading"><Icon name="mail" /><h2><label htmlFor="weekly-events-email">{t("이메일")}</label></h2></div><input id="weekly-events-email" type="email" autoComplete="email" placeholder={t("이메일 주소를 입력해 주세요")} /></div>
        <div className="weekly-events__panel weekly-events__actions">
          <div className="weekly-events__action-row"><button type="button" className="weekly-events__primary" disabled><Icon name="plus" />{t("알림 등록")}</button><button type="button" disabled><Icon name="bell" />{t("알림 해지")}</button></div>
          <button type="button" disabled><Icon name="send" />{t("테스트 전송")}</button>
          <p>{t("이메일 알림 등록과 발송 기능은 준비 중입니다.")}</p>
        </div>
      </div>
    </section>
    </div>
  );
}
