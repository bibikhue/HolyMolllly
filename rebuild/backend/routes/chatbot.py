from fastapi import APIRouter, Depends

from controllers import chatbot
from controllers.auth import require_user

router = APIRouter(tags=["챗봇"])
router.add_api_route("/chatbot/messages", chatbot.send_message, methods=["POST"], summary="현재 그래프를 참고해 질문에 답변")
router.add_api_route("/chatbot/planning", chatbot.plan_event, methods=["POST"], dependencies=[Depends(require_user)], summary="로그인 전용 관광 데이터 기반 행사 기획 상담")
