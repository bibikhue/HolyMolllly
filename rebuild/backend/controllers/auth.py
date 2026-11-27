from fastapi import Body, Cookie, Depends, Request, Response
from fastapi.responses import JSONResponse
from pydantic import SecretStr

from services.auth import (
    COOKIE_NAME, COOKIE_SECURE, SESSION_SECONDS,
    authenticate, create_session, read_session, revoke_session,
)


def require_user(request: Request, token: str | None = Cookie(default=None, alias=COOKIE_NAME)):
    user = read_session(token)
    if user is None:
        user = JSONResponse(status_code=401, content={"code": 401, "message": "로그인이 필요합니다."})
    request.state.user = user
    return user


def require_admin(request: Request, user=Depends(require_user)):
    if isinstance(user, JSONResponse):
        return user
    if user["role"] != "admin":
        request.state.user = JSONResponse(
            status_code=403, content={"code": 403, "message": "관리자 권한이 필요합니다."},
        )
        return request.state.user
    return user


def login(
    response: Response,
    username: str = Body(min_length=1, max_length=100),
    password: SecretStr = Body(min_length=1, max_length=256),
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    user = authenticate(username, password.get_secret_value())
    if user is None:
        return JSONResponse(
            status_code=401,
            content={"code": 401, "message": "아이디 또는 비밀번호가 올바르지 않습니다."},
        )
    revoke_session(token)
    response.set_cookie(
        COOKIE_NAME, create_session(user), max_age=SESSION_SECONDS,
        httponly=True, secure=COOKIE_SECURE, samesite="lax", path="/api",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"user": user}


def get_current_user(request: Request, response: Response):
    if isinstance(request.state.user, JSONResponse):
        return request.state.user
    response.headers["Cache-Control"] = "no-store"
    return {"user": request.state.user}


def logout(response: Response, token: str | None = Cookie(default=None, alias=COOKIE_NAME)):
    revoke_session(token)
    response.delete_cookie(COOKIE_NAME, path="/api", httponly=True,
                           secure=COOKIE_SECURE, samesite="lax")
    response.headers["Cache-Control"] = "no-store"
    return {"message": "로그아웃되었습니다."}
