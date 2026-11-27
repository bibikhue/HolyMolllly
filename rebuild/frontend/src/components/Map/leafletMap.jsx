import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function createLeafletMap(container) {
  const map = L.map(container, {
    preferCanvas: true,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 200,
  }).setView([35.1796, 129.0756], 12);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  return map;
}
