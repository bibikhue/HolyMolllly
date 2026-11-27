from fastapi import APIRouter, Depends

from controllers import auth


router = APIRouter(prefix="/auth", tags=["로그인"])
router.add_api_route(
    "/login", auth.login, methods=["POST"],
    summary="임시 계정 로그인",
    description="계정을 확인하고 role이 포함된 세션 쿠키를 발급합니다.",
)
router.add_api_route(
    "/me", auth.get_current_user, methods=["GET"],
    dependencies=[Depends(auth.require_user)],
    summary="현재 로그인 사용자 조회",
)
router.add_api_route(
    "/logout", auth.logout, methods=["POST"],
    summary="로그아웃",
)
