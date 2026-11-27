import { useLayoutEffect, useRef } from "react";
import Plotly from "plotly.js/lib/core";
import pie from "plotly.js/lib/pie";
import createPlotlyComponent from "react-plotly.js/factory";
import { CHART_COLORS as DONUT_COLORS } from "../constants/charts";
import "./DonutChart.css";

Plotly.register([pie]);
const Plot = createPlotlyComponent(Plotly);

const formatNumber = (value) => value.toLocaleString("ko-KR");

/** data: [{ label, value, color? }]. Use the same color per category across charts. */
export function DonutLegend({ data, unit = "", showValues = false, formatValue = formatNumber }) {
  return (
    <ul className="donut-chart__legend">
      {data.map((item, index) => (
        <li key={item.label}>
          <span className="donut-chart__swatch" style={{ backgroundColor: item.color ?? DONUT_COLORS[index % DONUT_COLORS.length] }} />
          <span className="donut-chart__legend-label">{item.label}</span>
          {showValues && <span className="donut-chart__legend-value">{formatValue(item.value)}{unit}</span>}
        </li>
      ))}
    </ul>
  );
}

/** legend: "right" | "bottom" | "none". centerValue defaults to the total; null hides it. */
export default function DonutChart({
  data = [], title, centerLabel, centerValue, unit = "", legend = "right",
  legendTitle, showLegendValues = true, showLabels = false, hole = 0.5,
  formatValue = formatNumber, chartSize, showDataTable = true,
  minLabelPercent = 0, percentDigits = 2,
  legendWidth = 220,
}) {
  const items = data.filter(({ value }) => Number.isFinite(value) && value >= 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;
  const containerRef = useRef(null);
  const plotRef = useRef(null);
  useLayoutEffect(() => {
    if (!hasData) return;
    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (plotRef.current && containerRef.current?.clientWidth && containerRef.current?.clientHeight) {
          Plotly.Plots.resize(plotRef.current);
        }
      });
    });
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [hasData]);
  const center = centerValue === undefined ? `${formatValue(total)}${unit}` : centerValue;

  return (
    <section className="donut-chart-wrapper" aria-label={title ?? centerLabel ?? "도넛 차트"}>
    {title && <h3 className="donut-chart__title">{title}</h3>}
    <div className={`donut-chart-container${chartSize ? " donut-chart-container--fixed" : ""}`}>
    <div className={`donut-chart donut-chart--${legend}`}
      style={chartSize && legend === "right" ? { gridTemplateColumns: `${chartSize}px ${legendWidth}px` } : undefined}>
      {total > 0 ? (
        <>
          <div className="donut-chart__plot" ref={containerRef}
            style={chartSize ? { width: chartSize, height: chartSize } : undefined}>
            <Plot
              data={[{
                type: "pie", labels: items.map((item) => item.label), values: items.map((item) => item.value),
                hole, sort: false, direction: "clockwise", showlegend: false,
                marker: { colors: items.map((item, index) => item.color ?? DONUT_COLORS[index % DONUT_COLORS.length]), line: { color: "#fff", width: 2 } },
                textinfo: "text",
                text: items.map((item) => {
                  const percent = item.value / total * 100;
                  return percent < minLabelPercent ? "" : `${showLabels ? `${item.label}<br>` : ""}${percent.toFixed(percentDigits)}%`;
                }),
                texttemplate: "%{text}",
                textposition: "inside", insidetextorientation: "horizontal",
                textfont: { size: 16, color: "#fff" },
                customdata: items.map((item) => `${formatValue(item.value)}${unit}`),
                hovertemplate: "%{label}<br>%{customdata}<br>%{percent}<extra></extra>",
              }]}
              layout={{
                autosize: true, margin: { t: 4, r: 4, b: 4, l: 4 },
                paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                font: { family: "Pretendard, sans-serif" },
                uniformtext: { minsize: 14, mode: "hide" },
              }}
              config={{ responsive: true, displayModeBar: false }}
              useResizeHandler
              onInitialized={(_, element) => { plotRef.current = element; }}
              onPurge={() => { plotRef.current = null; }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
            <div className="donut-chart__center" style={{ width: `${hole * 90}%` }}>
              {centerLabel && <span>{centerLabel}</span>}
              {center != null && <strong>{center}</strong>}
            </div>
          </div>
          {legend !== "none" && (
            <div className="donut-chart__legend-container">
              {legendTitle && <h4>{legendTitle}</h4>}
              <DonutLegend data={items} unit={unit} showValues={showLegendValues} formatValue={formatValue} />
            </div>
          )}
          {showDataTable && <details className="donut-chart__table">
            <summary>차트 데이터 보기</summary>
            <table>
              <caption>{title ?? centerLabel ?? "도넛 차트"}</caption>
              <thead><tr><th scope="col">항목</th><th scope="col">값{unit && ` (${unit})`}</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td>{formatValue(item.value)}</td></tr>)}</tbody>
            </table>
          </details>}
        </>
      ) : <p className="donut-chart__empty">표시할 데이터가 없습니다.</p>}
    </div>
    </div>
    </section>
  );
}

/** Place DonutChart children with legend="none" here and pass shared legendData. */
export function DonutChartGrid({ children, legendData = [], legendTitle }) {
  return (
    <div className="donut-chart-group">
      <div className="donut-chart-grid">{children}</div>
      {legendTitle && <h4>{legendTitle}</h4>}
      {legendData.length > 0 && <DonutLegend data={legendData} />}
    </div>
  );
}
