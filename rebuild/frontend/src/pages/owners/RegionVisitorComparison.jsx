import LoadingSpinner from "../../components/LoadingSpinner";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Plotly from "plotly.js/lib/core";
import bar from "plotly.js/lib/bar";
import createPlotlyComponent from "react-plotly.js/factory";
import { getRegionVisitorComparison } from "../../apis/owners";
import { AREA_COLORS } from "../../constants/charts";
import { useChatDataset } from "../../components/chatDatasets";

Plotly.register([bar]);
const Plot = createPlotlyComponent(Plotly);
const DOMESTIC = [{ name: "외지인", color: "#4ea8de" }];
const COUNTRIES = [
  { name: "대만", color: "#f4a261" }, { name: "중국", color: "#76c893" },
  { name: "일본", color: "#9b8afb" }, { name: "미국", color: "#eac44b" },
  { name: "기타", color: "#b8c3ce" },
];
const formatCount = (value) => (value / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 1 });

function RegionPanel({ groups, foreign = false }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [hidden, setHidden] = useState([]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const series = foreign ? COUNTRIES : DOMESTIC;
  const countFor = (row, name) => foreign ? row.foreign_counts[name] ?? 0 : row.domestic_cnt;
  let position = 0;
  const rows = [];
  const regions = [];
  for (const group of groups) {
    regions.push({ name: group.name, y: position });
    position += 1;
    for (const district of group.districts) rows.push({ ...district, y: position++ });
    position += .5;
  }
  const totals = rows.map((row) => ({ y: row.y, count: series.filter((item) => !hidden.includes(item.name)).reduce((sum, item) => sum + countFor(row, item.name), 0) }));
  const maximum = Math.max(1, ...totals.map((item) => item.count)) / 10000;
  const plotWidth = Math.max(1, width - 150);
  const height = rows.length * 30 + 160;
  const title = foreign ? "국가별 외국인 누적 방문 현황" : "외지인 누적 방문 현황";
  return (
    <section ref={containerRef} className="comparison-bar-chart" aria-label={title}>
      <h2>{title}</h2>
      <div className="comparison-bar-chart__legend">{series.map((item) => <button type="button" key={item.name} aria-pressed={!hidden.includes(item.name)} onClick={() => setHidden((previous) => previous.includes(item.name) ? previous.filter((name) => name !== item.name) : [...previous, item.name])}><i style={{ backgroundColor: item.color }} />{item.name}</button>)}</div>
      <Plot data={series.map((item) => ({
        type: "bar", orientation: "h", name: item.name, visible: hidden.includes(item.name) ? "legendonly" : true,
        x: rows.map((row) => countFor(row, item.name) / 10000), y: rows.map((row) => row.y),
        width: .7, marker: { color: item.color },
        text: rows.map((row) => {
          const count = countFor(row, item.name);
          return foreign && (count / 10000 / (maximum * 1.22)) * plotWidth >= 38 ? formatCount(count) : "";
        }),
        textposition: "inside", insidetextanchor: "middle", textangle: 0, constraintext: "inside", textfont: { size: 11, color: "#12324a" },
        customdata: rows.map((row) => [row.sgg_nm, countFor(row, item.name)]),
        hovertemplate: "%{customdata[0]}<br>%{customdata[1]:,.0f}" + (foreign ? "명" : "건") + "<extra>%{fullData.name}</extra>",
      }))} layout={{
        width, height, barmode: "stack", showlegend: false,
        margin: { t: 20, r: 24, b: 64, l: 92 },
        font: { family: "Pretendard, sans-serif", size: 12, color: "#4f6577" }, paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        xaxis: { title: { text: foreign ? "<b>누적 외국인 방문객 수 (만 명)</b>" : "<b>누적 외지인 방문 수 (만 건)</b>", standoff: 14 }, range: [0, maximum * 1.22], nticks: 5, tickformat: ",.0f", gridcolor: "#e8eef4", zeroline: false, fixedrange: true },
        yaxis: { range: [position - .6, -.5], tickvals: rows.map((row) => row.y), ticktext: rows.map((row) => row.sgg_nm), showgrid: false, zeroline: false, fixedrange: true, automargin: true },
        shapes: regions.map((region) => ({ type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: region.y, y1: region.y, line: { color: "#dce5ed", width: 1 } })),
        annotations: [
          ...regions.map((region) => ({ xref: "paper", x: 0, yref: "y", y: region.y, text: "<b>" + region.name + "</b>", showarrow: false, xanchor: "right", xshift: -10, bgcolor: AREA_COLORS[region.name] + "40", borderpad: 4, font: { size: 12, color: "#12324a" } })),
          ...totals.filter((item) => item.count > 0).map((item) => ({ x: item.count / 10000, y: item.y, showarrow: false, xanchor: "left", xshift: 4, text: "<b>" + formatCount(item.count) + "</b>", font: { size: 11, color: "#12324a" } })),
        ],
      }} config={{ displayModeBar: false, responsive: true }} style={{ width: "100%", height }} />
    </section>
  );
}

export default function RegionVisitorComparison({ start, end }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const requestKey = `${start}:${end}`;
  useChatDataset("owners-region-visitors", { period: { start_ym: start, end_ym: end }, units: { domestic_cnt: "방문 건수", foreign_total: "명" }, status: error ? "error" : result?.requestKey === requestKey ? "ready" : "loading", data: result?.requestKey === requestKey ? result : null });
  useEffect(() => {
    const controller = new AbortController();
    getRegionVisitorComparison({ start_ym: start, end_ym: end }, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setResult({ ...data, requestKey }); })
      .catch((error) => { if (!controller.signal.aborted) setError(error.response?.data?.message || "권역별 방문 현황을 불러오지 못했습니다."); });
    return () => controller.abort();
  }, [start, end, requestKey]);
  const hasData = result?.groups.some((group) => group.districts.some((row) => row.domestic_cnt || row.foreign_total));
  return (
    <section className="owners-visits__interests" aria-label="권역별 구·군 누적 관광객 방문 현황">
      {error ? <p role="alert">{error}</p> : !result ? <LoadingSpinner label="권역별 방문 현황을 불러오는 중입니다." /> : hasData ? (
        <div className="owners-visits__region-comparison">
          <RegionPanel groups={result.groups} />
          <RegionPanel groups={result.groups} foreign />
        </div>
      ) : <p className="owners-visits__empty">선택한 기간에 표시할 데이터가 없습니다.</p>}
    </section>
  );
}
