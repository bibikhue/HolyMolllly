export function RouteFilter({ routes, visibleRoutes, onToggle }) {
  return (
    <fieldset className="subway-route-filter">
      <legend>대중교통</legend>
      <div className="subway-route-filter-options">
        {routes.map((route) => (
          <label key={route.id}>
            <input
              type="checkbox"
              checked={visibleRoutes === null || visibleRoutes.has(route.id)}
              onChange={() => onToggle(route.id)}
            />
            <span
              aria-hidden="true"
              className="subway-route-swatch"
              style={{ backgroundColor: route.color }}
            />
            {route.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function StationDensityFilter({ visibleCounts, onToggle }) {
  return (
    <aside className="subway-density-filter" aria-label="500m 이내 역 개수 필터">
      <h2>역 밀집 필터</h2>
      <p>반경 500m 이내 역 개수</p>
      {[2, 3].map((count) => (
        <label key={count} className="subway-density-filter__option">
          <input
            type="checkbox"
            checked={visibleCounts.has(count)}
            onChange={() => onToggle(count)}
          />
          <span className={`subway-density-filter__badge subway-density-filter__badge--${count}`}>
            {count}
          </span>
          <span>{count}개 역</span>
        </label>
      ))}
      <p className="subway-density-filter__hint">선택하면 해당 지역을 지도에 표시합니다.</p>
    </aside>
  );
}
