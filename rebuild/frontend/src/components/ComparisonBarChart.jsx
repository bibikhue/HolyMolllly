import { useLayoutEffect, useRef, useState } from "react";
import Plotly from "plotly.js/lib/core";
import bar from "plotly.js/lib/bar";
import createPlotlyComponent from "react-plotly.js/factory";

Plotly.register([bar]);
const Plot = createPlotlyComponent(Plotly);

export default function ComparisonBarChart({ title, labels, series, horizontal = false, height = 340, unit = "건", scale = 10000 }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [hiddenSeries, setHiddenSeries] = useState([]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const categories = labels.map((label) => label.length > 12 ? `${label.slice(0, 12)}…` : label);
  const numericAxis = { title: { text: `<b>누적 ${unit === "건" ? "방문 수" : "방문객 수"} (만 ${unit})</b>`, standoff: 12 }, rangemode: "tozero", gridcolor: "#e8eef4", zeroline: false, tickformat: horizontal ? ",.1f" : ",.0f", automargin: true };
  const categoryAxis = { type: "category", tickvals: labels, ticktext: categories, automargin: true, showgrid: false, ...(horizontal ? { autorange: "reversed" } : {}) };
  const hasData = series.some((item) => item.values.some((value) => value > 0));
  return (
    <section ref={containerRef} className="comparison-bar-chart" aria-label={title}>
      <h2>{title}</h2>
      {hasData ? <>
        <div className="comparison-bar-chart__legend">{series.map((item) => <button type="button" key={item.name} aria-pressed={!hiddenSeries.includes(item.name)} aria-label={`${item.name} 표시`} onClick={() => setHiddenSeries((previous) => previous.includes(item.name) ? previous.filter((name) => name !== item.name) : [...previous, item.name])}><i style={{ backgroundColor: item.color }} />{item.name}</button>)}</div>
        <Plot data={series.map((item) => ({
          type: "bar", name: item.name, orientation: horizontal ? "h" : "v", visible: hiddenSeries.includes(item.name) ? "legendonly" : true,
          x: horizontal ? item.values.map((value) => value / scale) : labels,
          y: horizontal ? labels : item.values.map((value) => value / scale),
          customdata: item.values.map((value, index) => [labels[index], value]),
          marker: { color: item.color },
          text: horizontal ? undefined : item.values.map((value) => `${(value / scale).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만`),
          textposition: "outside", cliponaxis: false, textfont: { size: 11 },
          hovertemplate: `%{customdata[0]}<br>%{customdata[1]:,.0f}${unit}<extra>%{fullData.name}</extra>`,
        }))} layout={{
          width, height, barmode: "group", bargap: horizontal ? 0.2 : 0.25, bargroupgap: 0.08,
          margin: { t: 24, r: 16, b: 60, l: horizontal ? 150 : 64 },
          paper_bgcolor: "transparent", plot_bgcolor: "transparent", showlegend: false,
          font: { family: "Pretendard, sans-serif", size: 12, color: "#4f6577" }, uniformtext: { minsize: 11, mode: "hide" },
          xaxis: horizontal ? numericAxis : categoryAxis, yaxis: horizontal ? categoryAxis : numericAxis,
          hovermode: "closest",
        }} config={{ displayModeBar: false, responsive: true }} style={{ width: "100%", height }} />
      </> : <p className="owners-visits__empty">선택한 기간에 표시할 데이터가 없습니다.</p>}
    </section>
  );
}
