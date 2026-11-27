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
  const legendColumns = measuredWidth >= 460 ? 4 : 3;
  const legendHeight = 28 + Math.ceil(series.length / legendColumns) * 20;
  const height = chartHeight ? chartHeight - legendHeight : Math.max(300, labels.length * 48) + 64;

  return (
    <section ref={containerRef} aria-label={title} style={{ width: "100%", maxWidth: width, minWidth: 0, marginInline: "auto" }}>
      <h3 style={{ margin: "0 0 20px", fontSize: 20 }}>{title}</h3>
      {labels.length && series.length ? (
        <>
        <Plot
          data={series.map((item) => ({
            type: "bar", orientation: "h", name: item.name, y: labels, x: item.values,
            width: 0.72, marker: { color: item.color, line: { color: "#fff", width: 1 } },
            text: item.values.map((value) => {
              const segmentWidth = Math.max(0, measuredWidth - 68) * value / 100;
              return segmentWidth >= 36 ? `${value.toFixed(1)}%` : "";
            }),
            texttemplate: "%{text}", textposition: "inside", insidetextanchor: "middle", textangle: 0,
            textfont: { size: 11, color: "#222" }, constraintext: "inside",
            customdata: item.counts,
            hovertemplate: "%{y}<br>%{fullData.name}: %{x:.2f}%<br>방문 건수: %{customdata:,.0f}건<extra></extra>",
          }))}
          layout={{
            width: measuredWidth, height,
            margin: { t: 8, r: 8, b: 64, l: 60 },
            barmode: "stack", paper_bgcolor: "transparent", plot_bgcolor: "transparent",
            font: { family: "Pretendard, sans-serif", size: 12, color: "#12324a" },
            xaxis: { title: { text: "<b>연령대별 지역 방문 비율</b>", standoff: 14 }, range: [0, 100], dtick: 20, fixedrange: true, ticksuffix: "%", gridcolor: "#e5e7eb", zeroline: false },
            yaxis: { type: "category", categoryorder: "array", categoryarray: labels, autorange: "reversed", showgrid: false, automargin: true },
            showlegend: false,
            hovermode: "closest",
          }}
          style={{ width: "100%", height }}
          config={{ displayModeBar: false, responsive: true }}
        />
        <div className="age-district-legend" style={{ gridTemplateColumns: `repeat(${legendColumns}, minmax(0, 1fr))` }}>
          <strong>구·군</strong>
          {series.map((item) => (
            <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}</span>
          ))}
        </div>
        </>
      ) : <p>선택한 기간에 표시할 방문 데이터가 없습니다.</p>}
    </section>
  );
}
