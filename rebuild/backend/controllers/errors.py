from fastapi.responses import JSONResponse


def handle_service_error(operation, *args, **kwargs):
    try:
        return operation(*args, **kwargs)
    except ValueError as error:
        if len(error.args) != 2 or not isinstance(error.args[0], int):
            raise
        code, message = error.args
        return JSONResponse(
            status_code=code,
            content={"code": code, "message": message},
        )
