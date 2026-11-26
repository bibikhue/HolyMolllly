import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import trainUrl from "./busan_train.geojson?url";
import "./Subway.css";
import createLeafletMap from "../Map/leafletMap.jsx";

const routeColors = {
    "1": "#e85d04",
    "2": "#4b9b42",
    "3": "#b8860b",
    "4": "#2878b5",
    DONGHAE: "#1877b9",
};
const defaultRoutes = Object.entries(routeColors).map(([id, color]) => ({
    id,
    name: id === "DONGHAE" ? "동해선" : `부산 ${id}호선`,
    color,
}));
const fallbackColors = ["#c04f72", "#168b83", "#7c6a45", "#5166a8"];
const routeColor = (id, index) => routeColors[id] || fallbackColors[index % fallbackColors.length];
const routeIdOf = (feature) => String(feature.properties.LINE_ID ?? feature.properties.LINE_NAME ?? feature.properties.rlway_nm);
const isLine = (feature) => feature.geometry?.type?.startsWith("Line") && (feature.properties?.LINE_NAME || feature.properties?.rlway_nm);
const isStation = (feature) => feature.geometry?.type === "Point" && feature.properties?.SRC_LABEL && feature.properties?.LINE_ID;
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
const getNearbyStationGroups = (stations) => {
    const groups = new Map();
    stations.forEach((station) => {
        const nearby = stations
            .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
            .filter(({ candidate }) => distanceMeters(station, candidate) <= 500);
        if (nearby.length !== 2 && nearby.length !== 3) return;
        const key = nearby.map(({ candidateIndex }) => candidateIndex).join(",");
        if (groups.has(key)) return;
        const [lng, lat] = station.geometry.coordinates;
        groups.set(key, {
            count: nearby.length,
            center: [lat, lng],
            stations: nearby.map(({ candidate }) => candidate),
        });
    });
    return [...groups.values()];
};

export default function SubwayMap() {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const trainLayers = useRef(null);
    const nearbyStationLayers = useRef(null);
    const [trainRoutes, setTrainRoutes] = useState(defaultRoutes);
    const [visibleRoutes, setVisibleRoutes] = useState(null);
    const [visibleStationCounts, setVisibleStationCounts] = useState(new Set());

    useEffect(() => {
        if (!mapRef.current) return undefined;

        const map = createLeafletMap(mapRef.current);
        mapInstance.current = map;
        const controller = new AbortController();
        const resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(mapRef.current);

        fetch(trainUrl, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`GeoJSON 요청 실패: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (controller.signal.aborted) return;
                const features = data.features.filter((feature) => isLine(feature) || isStation(feature));
                const discoveredRoutes = [...new Map(features.filter(isLine).map((feature) => {
                    const id = routeIdOf(feature);
                    return [id, { id, name: feature.properties.LINE_NAME || feature.properties.rlway_nm }];
                })).values()].sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
                const routes = discoveredRoutes.map((route, index) => ({ ...route, color: routeColor(route.id, index) }));
                setTrainRoutes(routes);

                const nearbyGroups = getNearbyStationGroups(features.filter(isStation));
                nearbyStationLayers.current = [2, 3].map((count) => {
                    const color = count === 2 ? "#e88735" : "#8a63c7";
                    const layers = nearbyGroups
                        .filter((group) => group.count === count)
                        .flatMap((group) => {
                            const names = [...new Set(group.stations.map((station) => station.properties.SRC_LABEL))];
                            const tooltip = `${names.join(" · ")} · ${count}개 역 (반경 500m)`;
                            return [
                                L.circle(group.center, { radius: 500, color, weight: 2, fillColor: color, fillOpacity: 0.13 })
                                    .bindTooltip(tooltip),
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
                });

                trainLayers.current = new Map(routes.map((route) => [route.id, L.geoJSON({
                    type: "FeatureCollection",
                    features: features.filter((feature) => routeIdOf(feature) === route.id),
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
                        isStation(feature) ? `${feature.properties.SRC_LABEL}역 · ${route.name}` : route.name,
                        { sticky: true },
                    ),
                }).addTo(map)]));
            })
            .catch((error) => {
                if (error.name !== "AbortError") console.error("지하철 GeoJSON을 불러오지 못했습니다.", error);
            });

        requestAnimationFrame(() => map.invalidateSize());

        return () => {
            controller.abort();
            resizeObserver.disconnect();
            trainLayers.current = null;
            nearbyStationLayers.current = null;
            mapInstance.current = null;
            map.remove();
        };
    }, []);

    useEffect(() => {
        if (!trainLayers.current || !mapInstance.current) return;
        trainLayers.current.forEach((layer, routeId) => {
            if (visibleRoutes === null || visibleRoutes.has(routeId)) layer.addTo(mapInstance.current);
            else layer.remove();
        });
    }, [visibleRoutes, trainRoutes]);

    useEffect(() => {
        if (!nearbyStationLayers.current || !mapInstance.current) return;
        nearbyStationLayers.current.forEach(([count, layer]) => {
            if (visibleStationCounts.has(count)) layer.addTo(mapInstance.current);
            else layer.remove();
        });
    }, [visibleStationCounts, trainRoutes]);

    return (
        <div className="subway-map-layout">
          <div className="subway-map">
            <fieldset className="subway-route-filter">
                <legend>노선 필터</legend>
                <div className="subway-route-filter-options">
                    {trainRoutes.map((route) => {
                        const checked = visibleRoutes === null || visibleRoutes.has(route.id);
                        return (
                            <label key={route.id}>
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => setVisibleRoutes((current) => {
                                        const next = new Set(current ?? trainRoutes.map((item) => item.id));
                                        if (next.has(route.id)) next.delete(route.id);
                                        else next.add(route.id);
                                        return next;
                                    })}
                                />
                                <span aria-hidden="true" className="subway-route-swatch" style={{ backgroundColor: route.color }} />
                                {route.name}
                            </label>
                        );
                    })}
                </div>
            </fieldset>
            <div ref={mapRef} className="subway-map-canvas" />
          </div>
          <aside className="subway-density-filter" aria-label="500m 이내 역 개수 필터">
            <h2>역 밀집 필터</h2>
            <p>반경 500m 이내 역 개수</p>
            {[2, 3].map((count) => (
              <label key={count} className="subway-density-filter__option">
                <input
                  type="checkbox"
                  checked={visibleStationCounts.has(count)}
                  onChange={() => setVisibleStationCounts((current) => {
                    const next = new Set(current);
                    if (next.has(count)) next.delete(count);
                    else next.add(count);
                    return next;
                  })}
                />
                <span className={`subway-density-filter__badge subway-density-filter__badge--${count}`}>{count}</span>
                <span>{count}개 역</span>
              </label>
            ))}
            <p className="subway-density-filter__hint">선택하면 해당 지역을 지도에 표시합니다.</p>
          </aside>
        </div>
    );
}
