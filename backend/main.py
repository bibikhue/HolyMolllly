"""One FastAPI application with all team feature routers registered."""

from fastapi import FastAPI

from backend.core.db import database_available
from backend.facility_map.router import router as facility_map_router
from backend.monthly_briefing.router import router as monthly_briefing_router
from backend.store_spend_map.router import router as store_spend_map_router
from backend.tour_course.router import router as tour_course_router
from backend.what_if.router import router as what_if_router


app = FastAPI(title="맙소사 기능 API")

app.include_router(tour_course_router, prefix="/api/v1/tour-course")
app.include_router(facility_map_router, prefix="/api/v1/facility-map")
app.include_router(store_spend_map_router, prefix="/api/v1/store-spend-map")
app.include_router(monthly_briefing_router, prefix="/api/v1/monthly-briefing")
app.include_router(what_if_router, prefix="/api/v1/what-if")


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "db": "ok" if database_available() else "unavailable",
    }
