import { useMemo, useState } from "react";
import "./Search.css";

const normalize = (value) => value.toLocaleLowerCase("ko").replace(/\s+/g, "");
const getLocationDetail = (location) => location.detail || location.routeName || "";
const getLocationType = (location) => {
  const kind = String(location.kind || "").toLowerCase().replace(/_/g, "-");
  return ["stop", "bus-stop", "busstop"].includes(kind) ? "정거장" : "역";
};

export default function Search({ locations = [], onSelect }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    const normalizedQuery = normalize(query).replace(/(역|정거장|정류장)$/, "");
    if (!normalizedQuery) return [];

    const detailCounts = new Map();
    locations.forEach((location) => {
      const key = `${location.name}\u0000${getLocationDetail(location)}`;
      detailCounts.set(key, (detailCounts.get(key) || 0) + 1);
    });

    return locations
      .filter((location) => normalize(location.name).includes(normalizedQuery))
      .slice(0, 8)
      .map((location) => ({
        ...location,
        detail: getLocationDetail(location),
        typeLabel: getLocationType(location),
        hasDuplicate: detailCounts.get(
          `${location.name}\u0000${getLocationDetail(location)}`,
        ) > 1,
      }));
  }, [locations, query]);

  const hasQuery = Boolean(query.trim());
  const handleSelect = (location) => {
    setQuery(location.name);
    setIsOpen(false);
    onSelect?.(location);
  };

  return (
    <div className="location-search">
      <label className="location-search__label" htmlFor="map-location-search">
        역 또는 정거장 검색
      </label>
      <input
        id="map-location-search"
        className="location-search__input"
        type="search"
        placeholder="역 또는 정거장 이름 검색"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        aria-controls="map-location-search-results"
        aria-expanded={isOpen && hasQuery}
      />
      {isOpen && hasQuery && (
        <ul id="map-location-search-results" className="location-search__results">
          {results.length > 0 ? results.map((location) => (
            <li key={location.id}>
              <button
                type="button"
                className="location-search__result"
                onClick={() => handleSelect(location)}
              >
                <span className="location-search__name">
                  {location.name}{location.typeLabel}
                </span>
                {location.detail && (
                  <span className="location-search__detail">{location.detail}</span>
                )}
                {location.hasDuplicate && location.latlng && (
                  <span className="location-search__coordinates">
                    {location.latlng[0].toFixed(4)}, {location.latlng[1].toFixed(4)}
                  </span>
                )}
              </button>
            </li>
          )) : (
            <li className="location-search__empty">검색 결과가 없습니다.</li>
          )}
        </ul>
      )}
    </div>
  );
}
