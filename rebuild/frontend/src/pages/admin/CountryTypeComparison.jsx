import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Plotly from "plotly.js/lib/core";
import scatter from "plotly.js/lib/scatter";
import bar from "plotly.js/lib/bar";
import createPlotlyComponent from "react-plotly.js/factory";
import { getCountryClusters } from "../../apis/owners";
import LoadingSpinner from "../../components/LoadingSpinner";
import "./CountryTypeComparison.css";
import { useChatDataset } from "../../components/chatDatasets";

Plotly.register([scatter, bar]);
const Plot = createPlotlyComponent(Plotly);
const FEATURE_COLORS = ["#e69f00", "#56b4e9", "#d55e00", "#0072b2", "#009e73", "#cc79a7", "#6f68b7", "#8b6a43", "#4c9a9b", "#9c9e32", "#df6c6c"];

function labelsFor(points, rangeX, rangeY, width, height, maximum) {
  const boxes = [];
  const annotation = [];
  for (const point of [...points].sort((a, b) => b.visits_2025 - a.visits_2025)) {
    const x = (point.x - rangeX[0]) / (rangeX[1] - rangeX[0]) * width;
    const y = (rangeY[1] - point.y) / (rangeY[1] - rangeY[0]) * height;
    const radius = Math.max(5, Math.sqrt(point.visits_2025 / maximum) * 30);
    const textWidth = point.country_nm.length * 12 + 8;
    const distance = radius + 12;
    const candidates = [[distance, -14], [distance, 14], [-distance - textWidth, -14], [-distance - textWidth, 14], [-textWidth / 2, -distance - 10], [-textWidth / 2, distance + 6], [distance + 15, -38], [-distance - textWidth - 15, 38]];
    let best;
    for (const [dx, dy] of candidates) {
      const box = { left: x + dx, right: x + dx + textWidth, top: y + dy - 9, bottom: y + dy + 9 };
      const overlap = boxes.reduce((sum, previous) => sum + Math.max(0, Math.min(box.right, previous.right) - Math.max(box.left, previous.left)) * Math.max(0, Math.min(box.bottom, previous.bottom) - Math.max(box.top, previous.top)), 0);
      const overflow = Math.max(0, -box.left) + Math.max(0, box.right - width) + Math.max(0, -box.top) + Math.max(0, box.bottom - height);
      const score = overlap * 10 + overflow * 100 + Math.abs(dx) * .02 + Math.abs(dy) * .01;
      if (!best || score < best.score) best = { dx, dy, box, score };
    }
    boxes.push(best.box);
    annotation.push({ x: point.x, y: point.y, text: point.country_nm, ax: best.dx, ay: best.dy, xanchor: "left", yanchor: "middle", showarrow: true, arrowhead: 0, arrowwidth: .6, arrowcolor: "#b5c3cf", standoff: radius, font: { size: 12, color: "#263f52" } });
  }
  return annotation;
}

export default function CountryTypeComparison({ period, district }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(900);
  const [response, setResponse] = useState(null);
  const [failure, setFailure] = useState(null);
  const [hidden, setHidden] = useState([]);
  const [hiddenFeatures, setHiddenFeatures] = useState([]);
  const requestKey = `${period.start_ym}:${period.end_ym}:${district}`;
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setWidth(Math.floor(entry.contentRect.width)); });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    getCountryClusters({ ...period, sgg_cd: district }, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setResponse({ ...data, requestKey }); })
      .catch((error) => { if (!controller.signal.aborted) setFailure({ key: requestKey, message: error.response?.data?.message || "국가별 유형 분석을 불러오지 못했습니다." }); });
    return () => controller.abort();
  }, [period, district, requestKey]);

  const result = response?.requestKey === requestKey ? response : null;
  const error = failure?.key === requestKey ? failure.message : "";
  useChatDataset(`country-types-${district || "busan"}`, { period, district: district || "부산 전체", status: error ? "error" : result ? "ready" : "loading", data: result ? { scope: result.scope, feature_names: result.feature_names, clusters: result.clusters, data: result.data } : null });
  const rawPoints = result?.data ?? [];
  // One common scale preserves PCA directions and pairwise distance ratios.
  const coordinateScale = Math.max(1e-9, ...rawPoints.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)])) / 1.2;
  const points = rawPoints.map((point) => ({ ...point, x: point.x / coordinateScale, y: point.y / coordinateScale }));
  const maximum = Math.max(1, ...points.map((point) => point.visits_2025));
  const rangeX = [-1.5, 1.5], rangeY = [-1.5, 1.5];
  const height = width < 600 ? 480 : 540;
  const axisTitle = (axis, number) => {
    if (!axis) return "";
    return `국가 특성 축 ${number} (PCA 상대값, 설명력 ${axis.explained_pct.toFixed(1)}%)`;
  };
  const visiblePoints = points.filter((point) => !hidden.includes(point.cluster));
  const featureLabels = (result?.feature_names ?? []).map((name, index) => index === 4 || index === 5 ? `${name} (로그)` : name);
  const profileMaximum = Math.max(.5, ...(result?.clusters ?? []).flatMap((cluster) => cluster.profile.map((feature) => Math.abs(feature.standardized))));
  const profileLimit = Math.ceil(profileMaximum * 2) / 2 + .5;
  const profileClusters = (result?.clusters ?? []).filter((cluster) => !hidden.includes(cluster.id));
  const clusterLabels = profileClusters.map((cluster) => `${cluster.name} (${cluster.countries.length}개국)`);
  const profileHeight = width < 600 ? 440 : 500;
  return <section ref={ref} className="country-type-chart" aria-label="국가별 방문·소비 유형 비교" data-chat-context={JSON.stringify(result ? { scope: result.scope, period, features: result.feature_names, clusters: result.clusters.map((cluster) => ({ name: cluster.name, countries: cluster.countries, profile: cluster.profile, hidden: hidden.includes(cluster.id) })) } : { period, district, status: "loading" })}>
    <h2>{result ? `${result.scope} ` : ""}국가별 방문·소비 유형 비교</h2>
    {error ? <p className="country-type-chart__empty">{error}</p> : !result ? <LoadingSpinner label="DB 자료로 4개 군집을 분석하는 중입니다." /> : <>
      <div className="country-type-chart__legend">{result.clusters.map((cluster) => <button type="button" key={cluster.id} aria-pressed={!hidden.includes(cluster.id)} onClick={() => setHidden((previous) => previous.includes(cluster.id) ? previous.filter((id) => id !== cluster.id) : [...previous, cluster.id])}><i style={{ background: cluster.color }} />{cluster.name}</button>)}</div>
      <Plot data={result.clusters.map((cluster) => {
        const members = points.filter((point) => point.cluster === cluster.id);
        return { type: "scatter", mode: "markers", name: cluster.name, visible: hidden.includes(cluster.id) ? "legendonly" : true,
          x: members.map((point) => point.x), y: members.map((point) => point.y),
          marker: { size: members.map((point) => point.visits_2025), sizemode: "area", sizeref: 2 * maximum / (60 ** 2), sizemin: 5, color: cluster.color, opacity: .87, line: { color: "#fff", width: 1.4 } },
          customdata: members.map((point) => [point.country_nm, point.visits_2025, point.growth_pct, point.spend_per_visit]),
          hovertemplate: "<b>%{customdata[0]}</b><br>2025년 방문: %{customdata[1]:,.0f}명<br>2025/2024 성장률: %{customdata[2]:.1f}%<br>방문당 소비액: %{customdata[3]:,.0f}원<extra>%{fullData.name}</extra>",
        };
      })} layout={{ width, height, showlegend: false, margin: { t: 28, r: 32, b: 78, l: 76 },
        paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { family: "Pretendard, sans-serif", size: 11, color: "#617487" },
        xaxis: { range: rangeX, dtick: .5, tickformat: ".1f", title: { text: `<b>${axisTitle(result.axes[0], 1)}</b>`, standoff: 16, font: { size: 12 } }, showticklabels: true, showgrid: true, gridcolor: "#edf2f6", zeroline: true, zerolinecolor: "#b6c7d5", showline: true, linecolor: "#cbd5df", fixedrange: true },
        yaxis: { range: rangeY, dtick: .5, tickformat: ".1f", title: { text: `<b>${axisTitle(result.axes[1], 2)}</b>`, standoff: 16, font: { size: 12 } }, showticklabels: true, showgrid: true, gridcolor: "#edf2f6", zeroline: true, zerolinecolor: "#b6c7d5", showline: true, linecolor: "#cbd5df", fixedrange: true },
        annotations: [{ xref: "paper", yref: "paper", x: 0, y: 1.04, xanchor: "left", text: "원 크기 = 2025년 방문 규모", showarrow: false, font: { color: "#8a9aa7", size: 11 } }, ...labelsFor(visiblePoints, rangeX, rangeY, Math.max(1, width - 108), height - 106, maximum)],
      }} config={{ displayModeBar: false, responsive: true }} style={{ width: "100%", height }} />
      <section className="country-type-chart__profiles" aria-label="군집별 평균 지표 세로 막대 비교">
        <h2>군집별 평균 지표 비교</h2>
        <div className="country-type-chart__legend country-type-chart__feature-legend">{featureLabels.map((name, index) => <button type="button" key={name} aria-pressed={!hiddenFeatures.includes(index)} onClick={() => setHiddenFeatures((previous) => previous.includes(index) ? previous.filter((id) => id !== index) : [...previous, index])}><i style={{ background: FEATURE_COLORS[index] }} />{name}</button>)}</div>
        <Plot data={featureLabels.map((name, index) => ({
          type: "bar", orientation: "v", name, visible: hiddenFeatures.includes(index) ? "legendonly" : true,
          x: clusterLabels, y: profileClusters.map((cluster) => cluster.profile[index].standardized),
          marker: { color: FEATURE_COLORS[index] }, texttemplate: "%{y:+.2f}", textposition: "outside", cliponaxis: false,
          textfont: { size: 13 }, textangle: -90,
          hovertemplate: "<b>%{x}</b><br>%{fullData.name}<br>표준화 평균: %{y:+.2f}<extra></extra>",
        }))} layout={{ width, height: profileHeight, barmode: "group", bargap: .22, bargroupgap: .08, showlegend: false,
          margin: { t: 28, r: 24, b: 56, l: 80 },
          paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { family: "Pretendard, sans-serif", size: 12, color: "#4f6577" },
          xaxis: { type: "category", categoryorder: "array", categoryarray: clusterLabels, showgrid: false, zeroline: false, fixedrange: true, automargin: true, tickfont: { size: width < 600 ? 11 : 13 } },
          yaxis: { range: [-profileLimit, profileLimit], dtick: .5, tickformat: ".1f", title: { text: "<b>군집 평균 표준화 점수</b>", standoff: 16 }, zeroline: true, zerolinecolor: "#728da3", zerolinewidth: 1.5, gridcolor: "#edf2f6", fixedrange: true, automargin: true },
        }} config={{ displayModeBar: false, responsive: true }} style={{ width: "100%", height: profileHeight }} />
      </section>
    </>}
  </section>;
}
