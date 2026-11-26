from db import get_connection


def check_db():
    with get_connection() as connection:
        connection.exec_driver_sql("SELECT 1")
    return {"database": "ok"}
