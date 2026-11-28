import { useLayoutEffect, useRef, useState } from "react";
import Plotly from "plotly.js/lib/core";
import bar from "plotly.js/lib/bar";
import createPlotlyComponent from "react-plotly.js/factory";
import { SALES_COUNTRIES, formatEpayEok as formatEok } from "../../constants/charts";

Plotly.register([bar]);
const Plot = createPlotlyComponent(Plotly);

export default function SalesCountryChart({ countries, district }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(800);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setWidth(Math.floor(entry.contentRect.width)); });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const names = SALES_COUNTRIES.slice(0, 4).map((item) => item.name);
  const data = SALES_COUNTRIES.map((item) => ({ ...item, value: countries.filter((row) => item.name === "기타" ? !names.includes(row.country_nm) : row.country_nm === item.name).reduce((sum, row) => sum + Number(row.sales_amt), 0) }));
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const maximum = Math.max(1, ...data.map((row) => row.value)) / 100000;
  return <section ref={ref} className="owners-sales__chart" aria-label="국적별 간편결제 소비 규모">
    <h2>{district} 외국인 국적별 간편결제 소비 규모</h2>
    {total ? <Plot data={[{ type: "bar", x: data.map((row) => row.name), y: data.map((row) => row.value / 100000), marker: { color: data.map((row) => row.color) }, width: .58,
      text: data.map((row) => row.value ? `${(row.value / total * 100).toFixed(1)}%` : ""), textposition: "inside", insidetextanchor: "middle", textfont: { size: 14, color: "#12324a" },
      customdata: data.map((row) => formatEok(row.value)), hovertemplate: "%{x}<br>%{customdata}억원<br>%{text}<extra></extra>",
    }]} layout={{ width, height: 280, margin: { t: 30, r: 20, b: 44, l: 64 }, showlegend: false,
      paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { family: "Pretendard, sans-serif", size: 12, color: "#4f6577" },
      xaxis: { showgrid: false }, yaxis: { title: { text: "소비금액 (억원)" }, range: [0, maximum * 1.22], autorange: false, gridcolor: "#e8eef4", zeroline: false, automargin: true },
      annotations: data.filter((row) => row.value > 0).map((row) => ({ x: row.name, y: row.value / 100000, text: `<b>${formatEok(row.value)}억원</b>`, showarrow: false, yanchor: "bottom", yshift: 6, font: { size: 13, color: "#12324a" } })),
    }} config={{ displayModeBar: false, responsive: true }} style={{ width: "100%", height: 280 }} /> : <p className="owners-statistics__empty">선택한 조건에 표시할 소비 데이터가 없습니다.</p>}
  </section>;
}
