import { useLayoutEffect, useRef, useState } from "react";
import Plotly from "plotly.js/lib/core";
import scatter from "plotly.js/lib/scatter";
import createPlotlyComponent from "react-plotly.js/factory";
import { CHART_COLORS } from "../constants/charts";

Plotly.register([scatter]);
const Plot = createPlotlyComponent(Plotly);
const formatNumber = (value) => value.toLocaleString("ko-KR");

/** series: [{ name, x, y, color? }]. Missing values should be null. */
export default function LineChart({ title, showTitle = true, series = [], width = 880, height = 360, scale = 1, yTitle = "값", unit = "", formatValue = formatNumber, xAxis = {}, yAxis = {}, legendTitle = "국가", responsive = false }) {
  const containerRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(width);
  useLayoutEffect(() => {
    if (!responsive) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setMeasuredWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [responsive]);

  return (
    <section ref={containerRef} aria-label={title} style={{ width: responsive ? "100%" : width, minWidth: 0 }}>
      {showTitle && <h3 style={{ margin: "0 0 16px", fontSize: 20 }}>{title}</h3>}
      {series.some((item) => item.y.some((value) => value !== null)) ? (
        <Plot
          data={series.map((item, index) => ({
            type: "scatter", mode: "lines+markers", name: item.name,
            x: item.x, y: item.y.map((value) => value === null ? null : value / scale),
            customdata: item.y.map((value) => value === null ? null : formatValue(value)), connectgaps: false,
            line: { color: item.color ?? CHART_COLORS[index % CHART_COLORS.length], width: 1.8 },
            marker: { size: 4 },
            hovertemplate: `${xAxis.type === "linear" ? "%{x}월" : "%{x|%Y-%m}"}<br>%{customdata}${unit}<extra>%{fullData.name}</extra>`,
          }))}
          layout={{
            width: responsive ? measuredWidth : width, height, margin: { t: 12, r: 12, b: 78, l: 64 },
            paper_bgcolor: "transparent", plot_bgcolor: "transparent",
            font: { family: "Pretendard, sans-serif", size: 12, color: "#4f6577" },
            xaxis: { type: "date", title: { text: "연월" }, tickformat: "%Y-%m", tickangle: -90, showgrid: false, showline: true, linecolor: "#cbd5df", automargin: true, ...xAxis },
            yaxis: { title: { text: yTitle }, rangemode: "tozero", gridcolor: "#edf1f5", zeroline: false, automargin: true, ...yAxis },
            legend: {
              title: { text: `<b>${legendTitle}</b>`, side: "top center", font: { size: 12, color: "#4f6577" } },
              x: 1.02, y: 1, xanchor: "left", yanchor: "top",
              font: { size: 12, color: "#4f6577" }, itemsizing: "trace", itemwidth: 30,
              traceorder: "normal",
            },
            hovermode: "closest",
          }}
          style={responsive ? { width: "100%", height } : undefined}
          config={{ displayModeBar: false, responsive }}
        />
      ) : <p>표시할 데이터가 없습니다.</p>}
    </section>
  );
}
