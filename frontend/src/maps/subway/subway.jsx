import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import trainUrl from "./busan_train_v5.geojson?url";
import "./subway.css";
import createLeafletMap from "./leafletMap.js";

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

export default function SubwayMap() {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const trainLayers = useRef(null);
    const [trainRoutes, setTrainRoutes] = useState(defaultRoutes);
    const [visibleRoutes, setVisibleRoutes] = useState(null);

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
                })]));
            })
            .catch((error) => {
                if (error.name !== "AbortError") console.error("지하철 GeoJSON을 불러오지 못했습니다.", error);
            });

        requestAnimationFrame(() => map.invalidateSize());

        return () => {
            controller.abort();
            resizeObserver.disconnect();
            trainLayers.current = null;
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

    return (
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
    );
}
