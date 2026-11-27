import { useLayoutEffect, useRef, useState } from "react";
import Plotly from "plotly.js/lib/core";
import bar from "plotly.js/lib/bar";
import createPlotlyComponent from "react-plotly.js/factory";

Plotly.register([bar]);
const Plot = createPlotlyComponent(Plotly);

/** Each series contains { name, color, values: percentages[], counts: number[] }. */
export default function StackedBarChart({ title, labels = [], series = [], width = 880, height: chartHeight }) {
  const containerRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(width);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setMeasuredWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const legendColumns = Math.max(1, Math.floor((measuredWidth - 140) / 90));
  const bottomMargin = 90 + Math.ceil(series.length / legendColumns) * 20;
  const height = chartHeight ?? Math.max(300, labels.length * 48) + bottomMargin + 20;

  return (
    <section ref={containerRef} aria-label={title} style={{ width: "100%", maxWidth: width, minWidth: 0, marginInline: "auto" }}>
      <h3 style={{ margin: "0 0 20px", fontSize: 20 }}>{title}</h3>
      {labels.length && series.length ? (
        <Plot
          data={series.map((item) => ({
            type: "bar", orientation: "h", name: item.name, y: labels, x: item.values,
            width: 0.72, marker: { color: item.color, line: { color: "#fff", width: 1 } },
            text: item.values.map((value) => {
              const segmentWidth = Math.max(0, measuredWidth - 100) * value / 100;
              if (segmentWidth < 30) return "";
              return `${segmentWidth >= 64 ? `${item.name}<br>` : ""}${value.toFixed(1)}%`;
            }),
            texttemplate: "%{text}", textposition: "inside", insidetextanchor: "middle", textangle: 0,
            textfont: { size: 10, color: "#222" },
            customdata: item.counts,
            hovertemplate: "%{y}<br>%{fullData.name}: %{x:.2f}%<br>방문 건수: %{customdata:,.0f}건<extra></extra>",
          }))}
          layout={{
            width: measuredWidth, height,
            margin: { t: 8, r: 24, b: bottomMargin, l: 76 },
            barmode: "stack", paper_bgcolor: "transparent", plot_bgcolor: "transparent",
            font: { family: "Pretendard, sans-serif", size: 12, color: "#12324a" },
            xaxis: { title: { text: "연령대별 지역 방문 비율" }, range: [0, 100], dtick: 20, ticksuffix: "%", gridcolor: "#e5e7eb", zeroline: false },
            yaxis: { type: "category", categoryorder: "array", categoryarray: labels, autorange: "reversed", showgrid: false, automargin: true },
            legend: { title: { text: "구·군" }, traceorder: "normal", orientation: "h", x: 0.5, xanchor: "center", y: -0.2, yanchor: "top", entrywidth: 90, font: { size: 11 }, itemclick: false, itemdoubleclick: false },
            hovermode: "closest",
          }}
          style={{ width: "100%", height }}
          config={{ displayModeBar: false, responsive: true }}
        />
      ) : <p>선택한 기간에 표시할 방문 데이터가 없습니다.</p>}
    </section>
  );
}
