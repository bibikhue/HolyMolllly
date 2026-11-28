from fastapi import Body, Request, Response
from fastapi.responses import JSONResponse

from controllers.errors import handle_service_error
from services import chatbot


def send_message(
    response: Response,
    message: str = Body(min_length=1, max_length=2000),
    history: list[dict] = Body(default=[], max_length=24),
    context: dict | None = Body(default=None),
):
    response.headers["Cache-Control"] = "no-store"
    return handle_service_error(chatbot.reply, message, history, context)


def plan_event(
    request: Request,
    response: Response,
    message: str = Body(min_length=1, max_length=2000),
    history: list[dict] = Body(default=[], max_length=24),
    filters: dict = Body(default={}),
):
    if isinstance(request.state.user, JSONResponse):
        return request.state.user
    response.headers["Cache-Control"] = "no-store"
    return handle_service_error(chatbot.reply, message, history, None, filters)
