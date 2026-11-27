import L from "leaflet";
import "./leafletMap.css";

export default function addCurrentLocationControl(map) {
  let accuracyCircle = null;
  let locationMarker = null;
  let locationButton = null;
  let removed = false;

  const setButtonMessage = (message) => {
    locationButton.title = message;
    locationButton.setAttribute("aria-label", message);
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setButtonMessage("이 브라우저에서는 위치 기능을 사용할 수 없습니다.");
      return;
    }

    locationButton.disabled = true;
    setButtonMessage("현재 위치를 찾는 중입니다.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (removed) return;
        const position = [coords.latitude, coords.longitude];
        accuracyCircle?.remove();
        locationMarker?.remove();

        accuracyCircle = L.circle(position, {
          radius: coords.accuracy,
          color: "#2563eb",
          weight: 1,
          fillColor: "#3b82f6",
          fillOpacity: 0.12,
        }).addTo(map);
        locationMarker = L.circleMarker(position, {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#2563eb",
          fillOpacity: 1,
        }).addTo(map).bindPopup("내 현재 위치");
        map.setView(position, Math.max(map.getZoom(), 15));
        locationButton.disabled = false;
        setButtonMessage("현재 위치로 이동");
      },
      (error) => {
        if (removed) return;
        console.warn("현재 위치를 가져오지 못했습니다.", error.code, error.message);
        locationButton.disabled = false;
        setButtonMessage(error.code === error.PERMISSION_DENIED
          ? "브라우저에서 위치 권한을 허용해 주세요."
          : "현재 위치를 가져오지 못했습니다. 다시 눌러 주세요.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const control = L.control({ position: "bottomright" });
  control.onAdd = () => {
    const container = L.DomUtil.create("div", "leaflet-current-location-control");
    locationButton = L.DomUtil.create("button", "leaflet-current-location", container);
    locationButton.type = "button";
    setButtonMessage("현재 위치로 이동");
    locationButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"></circle><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"></path><circle cx="12" cy="12" r="8"></circle></svg>';
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(locationButton, "click", (event) => {
      L.DomEvent.preventDefault(event);
      requestCurrentLocation();
    });
    return container;
  };
  control.onRemove = () => {
    removed = true;
    if (locationButton) L.DomEvent.off(locationButton);
  };

  control.addTo(map);
  requestCurrentLocation();
  return control;
}
