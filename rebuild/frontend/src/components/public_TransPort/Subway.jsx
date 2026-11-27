import { useEffect, useRef, useState } from "react";
import trainUrl from "./busan_train_v6.geojson?url";
import "./Subway.css";
import createLeafletMap from "../Map/leafletMap.jsx";
import addCurrentLocationControl from "../Map/CurrentLocationControl.js";
import Search from "./Search.jsx";
import { DEFAULT_ROUTES } from "./subwayData.js";
import {
  createSelectedStationLayer,
  createSubwayMapData,
} from "./subwayLayers.js";
import { RouteFilter, StationDensityFilter } from "./SubwayFilters.jsx";

const toggleSetValue = (setValue, value, initialValues = []) => {
  setValue((current) => {
    const next = new Set(current ?? initialValues);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
};

export default function SubwayMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayers = useRef(null);
  const densityLayers = useRef(null);
  const selectedStationLayer = useRef(null);
  const [routes, setRoutes] = useState(DEFAULT_ROUTES);
  const [locations, setLocations] = useState([]);
  const [visibleRoutes, setVisibleRoutes] = useState(null);
  const [visibleStationCounts, setVisibleStationCounts] = useState(new Set());

  useEffect(() => {
    if (!mapRef.current) return undefined;

    const map = createLeafletMap(mapRef.current);
    addCurrentLocationControl(map);
    mapInstance.current = map;

    const controller = new AbortController();
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapRef.current);
    const resizeFrame = requestAnimationFrame(() => map.invalidateSize());

    fetch(trainUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`GeoJSON 요청 실패: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const mapData = createSubwayMapData(data.features);
        setRoutes(mapData.routes);
        setLocations(mapData.locations);
        routeLayers.current = mapData.routeLayers;
        densityLayers.current = mapData.stationDensityLayers;
        mapData.transferLayer.addTo(map);
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.error("지하철 GeoJSON을 불러오지 못했습니다.", error);
      });

    return () => {
      controller.abort();
      resizeObserver.disconnect();
      cancelAnimationFrame(resizeFrame);
      selectedStationLayer.current?.remove();
      selectedStationLayer.current = null;
      routeLayers.current = null;
      densityLayers.current = null;
      mapInstance.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    routeLayers.current?.forEach((layer, routeId) => {
      if (visibleRoutes === null || visibleRoutes.has(routeId)) layer.addTo(map);
      else layer.remove();
    });
    densityLayers.current?.forEach((layer, count) => {
      if (visibleStationCounts.has(count)) layer.addTo(map);
      else layer.remove();
    });
  }, [routes, visibleRoutes, visibleStationCounts]);

  const handleStationSelect = (station) => {
    const map = mapInstance.current;
    if (!map) return;

    setVisibleRoutes((current) => (
      current === null ? current : new Set([...current, station.routeId])
    ));
    selectedStationLayer.current?.remove();
    selectedStationLayer.current = createSelectedStationLayer(station).addTo(map);
    map.flyTo(station.latlng, Math.max(map.getZoom(), 16));
    selectedStationLayer.current.openPopup();
  };

  const toggleRoute = (routeId) => toggleSetValue(
    setVisibleRoutes,
    routeId,
    routes.map((route) => route.id),
  );

  return (
    <div className="subway-map-layout">
      <div className="subway-map">
        <RouteFilter routes={routes} visibleRoutes={visibleRoutes} onToggle={toggleRoute} />
        <div ref={mapRef} className="subway-map-canvas" />
        <Search locations={locations} onSelect={handleStationSelect} />
      </div>
      <StationDensityFilter
        visibleCounts={visibleStationCounts}
        onToggle={(count) => toggleSetValue(setVisibleStationCounts, count)}
      />
    </div>
  );
}
