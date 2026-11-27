import L from "leaflet";
import {
  getRoutes,
  getNearbyStationGroups,
  getLineName,
  getRouteId,
  getStationSearchOptions,
  getStationName,
  isLineFeature,
  isStationFeature,
  isTransferFeature,
} from "./subwayData.js";

export function createRouteLayers(features, routes) {
  return new Map(routes.map((route) => [route.id, L.geoJSON({
    type: "FeatureCollection",
    features: features.filter((feature) => getRouteId(feature) === route.id),
  }, {
    style: { color: route.color, weight: 4, opacity: 0.95 },
    pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
      radius: 4,
      color: "#fff",
      weight: 1.5,
      fillColor: route.color,
      fillOpacity: 1,
    }),
    onEachFeature: (feature, layer) => layer.bindTooltip(
      isStationFeature(feature) ? `${getStationName(feature)}역 · ${route.name}` : route.name,
      { sticky: true },
    ),
  })]));
}

export function createStationDensityLayers(features) {
  const stationFeatures = features.filter(isStationFeature);
  const groups = getNearbyStationGroups(stationFeatures);

  return new Map([2, 3].map((count) => {
    const color = count === 2 ? "#e88735" : "#8a63c7";
    const layers = groups
      .filter((group) => group.count === count)
      .flatMap((group) => {
        const names = [...new Set(group.stations.map(getStationName))];
        const tooltip = `${names.join(" · ")} · ${count}개 역 (반경 500m)`;
        return [
          L.circle(group.center, {
            radius: 500,
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.13,
          }).bindTooltip(tooltip),
          L.marker(group.center, {
            icon: L.divIcon({
              className: "subway-density-marker",
              html: `<span style="--density-color:${color}">${count}</span>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
          }).bindTooltip(tooltip),
        ];
      });

    return [count, L.layerGroup(layers)];
  }));
}

export function createTransferLayer(features) {
  const transfers = features.filter(isTransferFeature);
  return L.geoJSON({ type: "FeatureCollection", features: transfers }, {
    style: {
      color: "#475569",
      weight: 2,
      opacity: 0.85,
      dashArray: "4 6",
    },
    onEachFeature: (feature, layer) => {
      const properties = feature.properties || {};
      const from = properties.from_name || properties.FROM_NAME || "";
      const to = properties.to_name || properties.TO_NAME || "";
      const transferName = from && to ? `${from}역 ↔ ${to}역 환승` : getLineName(feature);
      if (transferName) layer.bindTooltip(transferName, { sticky: true });
    },
  });
}

export function createSubwayMapData(sourceFeatures) {
  const features = sourceFeatures.filter((feature) => (
    isLineFeature(feature)
    || isStationFeature(feature)
    || isTransferFeature(feature)
  ));
  const routes = getRoutes(features);

  return {
    routes,
    locations: getStationSearchOptions(features),
    routeLayers: createRouteLayers(features, routes),
    stationDensityLayers: createStationDensityLayers(features),
    transferLayer: createTransferLayer(features),
  };
}

export function createSelectedStationLayer(station) {
  return L.circleMarker(station.latlng, {
    radius: 10,
    color: "#fff",
    weight: 3,
    fillColor: "#e85d04",
    fillOpacity: 1,
  }).bindPopup(`${station.name}역 · ${station.routeName}`);
}
