import boundariesText from "../../data/busan-districts.geojson?raw";

const boundaries = JSON.parse(boundariesText);
const ringsFor = (feature) => feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates.flat() : feature.geometry.coordinates;
const points = boundaries.features.flatMap((feature) => ringsFor(feature).flat());
const west = Math.min(...points.map(([x]) => x));
const east = Math.max(...points.map(([x]) => x));
const south = Math.min(...points.map(([, y]) => y));
const north = Math.max(...points.map(([, y]) => y));
const aspect = Math.cos(35.2 * Math.PI / 180);
const scale = Math.min(680 / ((east - west) * aspect), 490 / (north - south));
const project = ([x, y]) => [20 + (x - west) * aspect * scale, 20 + (north - y) * scale];
const ringArea = (ring) => Math.abs(ring.reduce((sum, point, index) => sum + point[0] * ring[(index + 1) % ring.length][1] - ring[(index + 1) % ring.length][0] * point[1], 0)) / 2;
const mainPoints = boundaries.features.flatMap((feature) => ringsFor(feature).filter((ring) => ringArea(ring) > .000001).flat());
const mapHeight = Math.max(...mainPoints.map((point) => project(point)[1])) + 20;
const COLORS = ["#e5f2fc", "#bcdff8", "#87c5ef", "#469fda", "#1569a7"];
const LABEL_POSITIONS = { "26110": [340, 350], "26140": [210, 370], "26170": [400, 302], "26470": [435, 185], "26500": [438, 255], "26230": [250, 230], "26530": [183, 241], "26260": [278, 184] };
const CALLOUT_CODES = ["26110", "26140", "26170", "26470", "26500"];
const shapes = boundaries.features.map((feature) => {
  const rings = ringsFor(feature);
  const largest = [...rings].sort((a, b) => {
    const area = (ring) => Math.abs(ring.reduce((sum, point, i) => sum + point[0] * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * point[1], 0));
    return area(b) - area(a);
  })[0];
  let area = 0, x = 0, y = 0;
  largest.forEach((point, index) => {
    const next = largest[(index + 1) % largest.length];
    const cross = point[0] * next[1] - next[0] * point[1];
    area += cross; x += (point[0] + next[0]) * cross; y += (point[1] + next[1]) * cross;
  });
  const center = project([x / (3 * area), y / (3 * area)]);
  return { code: feature.properties.SIG_CD, name: feature.properties.SIG_KOR_NM, center,
    path: rings.map((ring) => ring.map((point, i) => `${i ? "L" : "M"}${project(point).join(",")}`).join(" ") + " Z").join(" ") };
});
const format = (value) => value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });

export default function SalesDistrictMap({ values, selected, onSelect }) {
  const maximum = Math.max(0, ...Object.values(values));
  const step = maximum ? maximum / 5 : 1;
  return <div className="owners-sales__map-frame" data-chat-context={JSON.stringify({ chart: "구·군별 간편결제 소비 지도", unit: "억원", data: shapes.map((shape) => ({ district: shape.name, value: values[shape.code] ?? null })) })}>
    <svg viewBox={`0 0 ${(east - west) * aspect * scale + 40} ${mapHeight}`} role="group" aria-label="부산 16개 구·군 간편결제 소비 분포 지도">
      {shapes.map((shape) => {
        const value = values[shape.code];
        const level = value == null ? -1 : Math.min(4, Math.floor(value / step));
        return <g key={shape.code}>
          <path d={shape.path} fill={level < 0 ? "#f0f3f6" : COLORS[level]} stroke={selected === shape.code ? "#16466b" : "#fff"} strokeWidth={selected === shape.code ? 2.4 : 1.4}
            role="button" tabIndex={0} aria-pressed={selected === shape.code} aria-label={`${shape.name} ${value == null ? "자료 없음" : format(value) + "억원"}`} onClick={() => onSelect(shape.code)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(shape.code); } }}>
            <title>{shape.name}: {value == null ? "자료 없음" : `${format(value)}억원`}</title>
          </path>
        </g>;
      })}
      <g pointerEvents="none">
        {shapes.filter((shape) => CALLOUT_CODES.includes(shape.code)).map((shape) => {
          const label = LABEL_POSITIONS[shape.code];
          return <line key={shape.code} x1={shape.center[0]} y1={shape.center[1]} x2={label[0]} y2={label[1] - 8} stroke="#8aa7bb" strokeWidth=".8" />;
        })}
        {shapes.map((shape) => {
          const value = values[shape.code];
          const level = value == null ? -1 : Math.min(4, Math.floor(value / step));
          const label = LABEL_POSITIONS[shape.code] ?? [shape.center[0], shape.center[1] - 3];
          const callout = CALLOUT_CODES.includes(shape.code);
          return <text key={shape.code} x={label[0]} y={label[1]} textAnchor="middle" fill={!callout && level >= 3 ? "#fff" : "#12324a"} className={callout ? "owners-sales__map-callout" : undefined}><tspan x={label[0]}>{shape.name}</tspan><tspan x={label[0]} dy="15">{value == null ? "—" : format(value)}</tspan></text>;
        })}
      </g>
    </svg>
    <div className="owners-sales__map-legend"><strong>소비 규모 (억원)</strong>{[4, 3, 2, 1, 0].map((level) => <span key={level}><i style={{ background: COLORS[level] }} />{level === 4 ? `${format(level * step)} 이상` : `${format(level * step)} ~ ${format((level + 1) * step)}`}</span>)}<span><i style={{ background: "#f0f3f6" }} />자료 없음</span></div>
  </div>;
}
