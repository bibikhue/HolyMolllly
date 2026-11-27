import { useLayoutEffect, useRef, useState } from "react";
import Plotly from "plotly.js/lib/core";
import box from "plotly.js/lib/box";
import scatter from "plotly.js/lib/scatter";
import createPlotlyComponent from "react-plotly.js/factory";

Plotly.register([box, scatter]);
const Plot = createPlotlyComponent(Plotly);

function boxStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p) => {
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
  };
  const q1 = percentile(0.25);
  const q3 = percentile(0.75);
  const iqr = q3 - q1;
  const withinFences = sorted.filter((value) => value >= q1 - 1.5 * iqr && value <= q3 + 1.5 * iqr);
  return {
    q1: [q1], median: [percentile(0.5)], q3: [q3],
    lowerfence: [withinFences[0]], upperfence: [withinFences.at(-1)],
  };
}

export default function BoxPlot({ data = [], title, showTitle = true, width = 880, height, responsive = false }) {
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
  const items = data.slice(0, 12);
  const stats = items.map((item) => boxStats(item.values));
  const hoverPoints = items.flatMap((item, index) => {
    const summary = stats[index];
    const values = [summary.lowerfence[0], summary.q1[0], summary.median[0], summary.q3[0], summary.upperfence[0]];
    const iqr = summary.q3[0] - summary.q1[0];
    const tooltip = [...values, Math.max(0, summary.q1[0] - 1.5 * iqr), summary.q3[0] + 1.5 * iqr];
    return values.map((value) => ({ value, country: item.country_nm, summary: tooltip }));
  });
  return (
    <section ref={containerRef} aria-label={typeof title === "string" ? title : "국가별 월별 1인당 관광소비액 분포"} style={{ width: responsive ? "100%" : width, minWidth: 0 }}>
      {showTitle && <h3 style={{ margin: "0 0 16px", fontSize: 20 }}>{title}</h3>}
      {items.length ? (
        <Plot
          data={[...items.map((item, index) => ({
            type: "box", orientation: "h", name: item.country_nm,
            ...stats[index], y: [item.country_nm],
            boxpoints: false,
            width: 0.6, whiskerwidth: 0.5, showwhiskers: true,
            fillcolor: "#9dc3e6", line: { color: "#2f75b5", width: 2 },
            hoverinfo: "skip",
          })), {
            type: "scatter", mode: "markers", showlegend: false,
            x: hoverPoints.map((point) => point.value),
            y: hoverPoints.map((point) => point.country),
            marker: { size: 18, opacity: 0 },
            customdata: hoverPoints.map((point) => point.summary),
            hovertemplate: "<b>%{y}</b><br>하한: %{customdata[0]:,.0f}원<br>1사분위: %{customdata[1]:,.0f}원<br>중앙값: %{customdata[2]:,.0f}원<br>3사분위: %{customdata[3]:,.0f}원<br>상한: %{customdata[4]:,.0f}원<br><br>이상치 기준<br>하한: %{customdata[5]:,.0f}원<br>상한: %{customdata[6]:,.0f}원<extra></extra>",
          }]}
          layout={{
            width: responsive ? measuredWidth : width, height: height ?? Math.max(300, items.length * 42 + 80),
            margin: { t: 8, r: 24, b: 56, l: 100 }, showlegend: false,
            paper_bgcolor: "transparent", plot_bgcolor: "transparent",
            font: { family: "Pretendard, sans-serif", color: "#222", size: 13 },
            hovermode: "closest",
            hoverlabel: { bgcolor: "#fff", bordercolor: "#c8d9e8", font: { color: "#12324a", size: 12 }, align: "left" },
            xaxis: { title: { text: "<b>월별 1인당 관광소비액 (원) (상위 12개국)</b>" }, nticks: 4, tickformat: ",.0f", ticksuffix: "원", gridcolor: "#e5e7eb", zeroline: false, rangemode: "tozero", automargin: true },
            yaxis: { type: "category", dtick: 1, tickfont: { size: 11 }, categoryorder: "array", categoryarray: items.map((item) => item.country_nm), autorange: "reversed", automargin: true },
            annotations: items.map((item) => ({
              x: item.median, y: item.country_nm, xref: "x", yref: "y",
              text: `<b>${Math.round(item.median).toLocaleString("ko-KR")}원</b>`,
              showarrow: false, xanchor: "left", xshift: 4,
              bgcolor: "rgba(255,255,255,.85)", font: { size: 12, color: "#111" },
            })),
          }}
          config={{ displayModeBar: false, responsive }}
        />
      ) : <p>선택한 기간에 표시할 데이터가 없습니다.</p>}
    </section>
  );
}
