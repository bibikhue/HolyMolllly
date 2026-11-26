from fastapi import status, File, UploadFile
from fastapi.responses import JSONResponse
from typing import List

from services import file as file_services

# 여러 파일 업로드
async def upload(
    files: List[UploadFile] = File(...)
):
    try:
        for file in files:
            file_services.upload(file)

        return JSONResponse(
            {"message": "파일 업로드 완료"},
            status_code=status.HTTP_201_CREATED
        )

    except Exception as e:
        return JSONResponse(
            {"message": "업로드 실패", "error": str(e)},
            status_code=status.HTTP_400_BAD_REQUEST
        )
