import { useLayoutEffect, useRef, useState } from "react";
import Plotly from "plotly.js/lib/core";
import bar from "plotly.js/lib/bar";
import createPlotlyComponent from "react-plotly.js/factory";

Plotly.register([bar]);
const Plot = createPlotlyComponent(Plotly);

/** groups: [{ name, color, data: [{ label, value, count }] }]. Values are percentages. */
export default function GroupedBarChart({ title, groups = [], width = 880, height }) {
  const containerRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(width);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setMeasuredWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const rows = groups.flatMap((group) => group.data.map((item) => ({ ...item, group: group.name })));
  const maximum = Math.max(0, ...rows.map((item) => item.value));
  const boundaries = groups.slice(0, -1).map((_, index) =>
    groups.slice(0, index + 1).reduce((sum, group) => sum + group.data.length, 0) - 0.5);
  return (
    <section ref={containerRef} aria-label={title} style={{ width: "100%", minWidth: 0 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 20 }}>{title}</h3>
      {maximum > 0 ? (
        <>
        <Plot
          data={groups.map((group) => {
            const indices = rows.flatMap((item, index) => item.group === group.name ? [index] : []);
            return {
              type: "bar", orientation: "h", name: group.name,
              x: group.data.map((item) => item.value), y: indices, width: 0.72,
              marker: { color: group.color },
              text: group.data.map((item) => (measuredWidth - 130) * item.value / 35 >= 34 ? `${item.value.toFixed(1)}%` : ""),
              textfont: { size: 11 },
              textposition: "inside", textangle: 0, insidetextanchor: "middle", constraintext: "inside", cliponaxis: false,
              customdata: group.data.map((item) => [item.label, item.count]),
              hovertemplate: "%{customdata[0]}<br>방문객: %{customdata[1]:,.0f}명<br>비율: %{x:.2f}%<extra>%{fullData.name}</extra>",
            };
          })}
          layout={{
            width: measuredWidth, height: height ? height - 28 : Math.max(400, rows.length * 32 + 140),
            margin: { t: 8, r: 24, b: 64, l: 106 }, barmode: "overlay",
            paper_bgcolor: "transparent", plot_bgcolor: "transparent",
            font: { family: "Pretendard, sans-serif", size: 12, color: "#12324a" },
            xaxis: { title: { text: "해당 국가 방문객 중 비율", standoff: 14 }, range: [0, 35], dtick: 5, fixedrange: true, ticksuffix: "%", gridcolor: "#e5e7eb", zeroline: false },
            yaxis: { type: "linear", range: [rows.length - 0.3, -0.7], tickvals: rows.map((_, index) => index), ticktext: rows.map((item) => `${item.group}  ${item.label}`), ticklabelstandoff: 18, showgrid: false, zeroline: false, automargin: true },
            shapes: boundaries.map((position) => ({ type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: position, y1: position, line: { color: "#dce4ec", width: 1 } })),
            annotations: rows.map((item, index) => ({
              x: item.value, y: index, xref: "x", yref: "y", showarrow: false,
              xanchor: "left", xshift: 4,
              text: `${(item.count / 10000).toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}만 명`,
              font: { size: 11, color: "#12324a" },
            })),
            showlegend: false,
            hovermode: "closest",
          }}
          config={{ displayModeBar: false, responsive: true }}
        />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, whiteSpace: "nowrap", fontSize: 11, width: "100%" }}>
          <strong>4권역</strong>
          {groups.map((group) => (
            <span key={group.name} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, backgroundColor: group.color }} />
              {group.name}
            </span>
          ))}
        </div>
        </>
      ) : <p>선택한 기간에 표시할 방문 데이터가 없습니다.</p>}
    </section>
  );
}
