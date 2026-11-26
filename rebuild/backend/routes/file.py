from fastapi import APIRouter

from controllers import file

router = APIRouter()
router.add_api_route("/upload",file.upload, methods=["POST"])
