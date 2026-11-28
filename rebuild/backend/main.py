import uvicorn

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import ages, auth, chatbot, countries, file, genders, industries, sidos, sigungu
from services.health import check_db


app = FastAPI(
    title="외국인 관광객 패턴분석 Backend API",
    description="부산 관광의 방문·소비 분석과 지역·국가별 기준정보를 제공하는 API입니다.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(chatbot.router)
api_router.include_router(sidos.router)
api_router.include_router(sigungu.router)
api_router.include_router(industries.router)
api_router.include_router(countries.router)
api_router.include_router(genders.router)
api_router.include_router(ages.router)
api_router.include_router(file.router, prefix="/file")
api_router.add_api_route(
    "/health", check_db, methods=["GET"], tags=["상태 확인"],
    summary="데이터베이스 연결 확인",
    description="데이터베이스에 연결해 간단한 조회가 가능한지 확인합니다.",
)
app.include_router(api_router)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
