from collections import deque
from threading import Lock
from time import monotonic
from typing import Literal

from fastapi import Body, Request, Response
from fastapi.responses import JSONResponse

from controllers.errors import handle_service_error
from services import chatbot


_data_requests = {}
_data_global_requests = deque()
_data_limit_lock = Lock()


def limit_data_questions(request: Request):
    """Bound anonymous OpenAI usage in the current single-process server."""
    now = monotonic()
    address = request.client.host if request.client else "unknown"
    request.state.data_access = None
    with _data_limit_lock:
        while _data_global_requests and _data_global_requests[0] <= now - 86400:
            _data_global_requests.popleft()
        for key in list(_data_requests):
            times = _data_requests[key]
            while times and times[0] <= now - 86400:
                times.popleft()
            if not times:
                del _data_requests[key]
        times = _data_requests.get(address, deque())
        if len(times) >= 30 or sum(stamp > now - 60 for stamp in times) >= 5 or len(_data_global_requests) >= 500:
            request.state.data_access = JSONResponse(status_code=429, content={"code": 429, "message": "데이터 질문 이용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."}, headers={"Retry-After": "60", "Cache-Control": "no-store"})
            return
        times.append(now)
        _data_requests[address] = times
        _data_global_requests.append(now)


def send_message(
    response: Response,
    message: str = Body(min_length=1, max_length=2000),
    history: list[dict] = Body(default=[], max_length=24),
    context: dict | None = Body(default=None),
    language: Literal["ko", "en", "ja", "zh-CN", "zh-TW"] = Body(default="ko"),
):
    response.headers["Cache-Control"] = "no-store"
    return handle_service_error(chatbot.reply, message, history, context, language=language)


def plan_event(
    request: Request,
    response: Response,
    message: str = Body(min_length=1, max_length=2000),
    history: list[dict] = Body(default=[], max_length=24),
    filters: dict = Body(default={}),
    language: Literal["ko", "en", "ja", "zh-CN", "zh-TW"] = Body(default="ko"),
):
    if isinstance(request.state.user, JSONResponse):
        return request.state.user
    response.headers["Cache-Control"] = "no-store"
    return handle_service_error(chatbot.reply, message, history, None, filters, language=language)


def ask_data(
    request: Request,
    response: Response,
    message: str = Body(min_length=1, max_length=2000),
    history: list[dict] = Body(default=[], max_length=24),
    filters: dict = Body(default={}),
    language: Literal["ko", "en", "ja", "zh-CN", "zh-TW"] = Body(default="ko"),
):
    if isinstance(request.state.data_access, JSONResponse):
        return request.state.data_access
    response.headers["Cache-Control"] = "no-store"
    return handle_service_error(chatbot.reply, message, history, None, data_filters=filters, language=language)
