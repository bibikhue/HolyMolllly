import sys, uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import file

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(file.router, prefix="/file")

if __name__ == "__main__":
    try:
        uvicorn.run(
            "main:app", 
            host="0.0.0.0",
            port=8000,
            reload=True)
    except Exception as e:
        sys.exit(1)
