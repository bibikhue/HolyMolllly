const routeColors = {
  "1": "#e85d04",
  L1: "#e85d04",
  "2": "#4b9b42",
  L2: "#4b9b42",
  "3": "#b8860b",
  L3: "#b8860b",
  "4": "#2878b5",
  L4: "#2878b5",
  DONGHAE: "#1877b9",
  DH: "#1877b9",
  BGL: "#7c4dca",
};

const fallbackColors = ["#c04f72", "#168b83", "#7c6a45", "#5166a8"];

export const DEFAULT_ROUTES = [
  { id: "L1", name: "부산 1호선", color: routeColors.L1 },
  { id: "L2", name: "부산 2호선", color: routeColors.L2 },
  { id: "L3", name: "부산 3호선", color: routeColors.L3 },
  { id: "L4", name: "부산 4호선", color: routeColors.L4 },
  { id: "DH", name: "동해선", color: routeColors.DH },
  { id: "BGL", name: "부산김해경전철", color: routeColors.BGL },
];

const propertiesOf = (feature) => feature.properties || {};

export const getRouteId = (feature) => {
  const properties = propertiesOf(feature);
  return String(
    properties.line_id
      ?? properties.LINE_ID
      ?? properties.LINE_NAME
      ?? properties.line_name
      ?? properties.rlway_nm
      ?? "",
  );
};

export const getLineName = (feature) => {
  const properties = propertiesOf(feature);
  return properties.line_name
    || properties.LINE_NAME
    || properties.ROUTE_NAME
    || properties.rlway_nm;
};

export const getStationName = (feature) => {
  const properties = propertiesOf(feature);
  return properties.stn_name || properties.SRC_LABEL || properties.STATION_NAME;
};

export const isTransferFeature = (feature) => {
  const properties = propertiesOf(feature);
  return feature.geometry?.type?.startsWith("Line")
    && (getRouteId(feature) === "XFER"
      || properties.link_type === "TRANSFER"
      || properties.LINK_TYPE === "TRANSFER");
};

export const isLineFeature = (feature) => (
  feature.geometry?.type?.startsWith("Line")
  && !isTransferFeature(feature)
  && getLineName(feature)
);

export const isStationFeature = (feature) => (
  feature.geometry?.type === "Point"
  && getStationName(feature)
  && getRouteId(feature)
);

export function getRoutes(features) {
  const discoveredRoutes = [...new Map(
    features.filter(isLineFeature).map((feature) => {
      const id = getRouteId(feature);
      return [id, { id, name: getLineName(feature) }];
    }),
  ).values()].sort((first, second) => first.name.localeCompare(second.name, "ko", { numeric: true }));

  return discoveredRoutes.map((route, index) => ({
    ...route,
    color: routeColors[route.id] || fallbackColors[index % fallbackColors.length],
  }));
}

export function getStationSearchOptions(features) {
  return features
    .filter(isStationFeature)
    .map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      const properties = propertiesOf(feature);
      const lineId = getRouteId(feature);
      return {
        id: `${lineId}-${properties.node_id ?? properties.NODE_ID ?? `${latitude}-${longitude}`}`,
        kind: "station",
        name: getStationName(feature),
        routeId: lineId,
        routeName: getLineName(feature) || `부산 ${lineId}호선`,
        latlng: [latitude, longitude],
      };
    })
    .sort((first, second) => (
      first.name.localeCompare(second.name, "ko")
      || first.routeName.localeCompare(second.routeName, "ko", { numeric: true })
    ));
}

const distanceMeters = (first, second) => {
  const [lng1, lat1] = first.geometry.coordinates;
  const [lng2, lat2] = second.geometry.coordinates;
  const radians = Math.PI / 180;
  const deltaLat = (lat2 - lat1) * radians;
  const deltaLng = (lng2 - lng1) * radians;
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(deltaLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(haversine));
};

export function getNearbyStationGroups(stations) {
  const groups = new Map();
  stations.forEach((station) => {
    const nearby = stations
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(({ candidate }) => distanceMeters(station, candidate) <= 500);
    if (nearby.length !== 2 && nearby.length !== 3) return;
    const key = nearby.map(({ candidateIndex }) => candidateIndex).join(",");
    if (groups.has(key)) return;
    const [longitude, latitude] = station.geometry.coordinates;
    groups.set(key, {
      count: nearby.length,
      center: [latitude, longitude],
      stations: nearby.map(({ candidate }) => candidate),
    });
  });
  return [...groups.values()];
}
