"""Create MariaDB connections only when a route needs one."""

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, URL
from sqlalchemy.pool import NullPool

from backend.core.config import Settings


def create_db_engine(settings: Settings | None = None) -> Engine | None:
    settings = settings or Settings()
    if not all(
        (
            settings.DB_PORT,
            settings.MYSQL_USER,
            settings.MYSQL_DATABASE,
            settings.MYSQL_PASSWORD,
        )
    ):
        return None

    url = URL.create(
        "mysql+pymysql",
        username=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD.get_secret_value(),
        host=settings.HOST,
        port=settings.DB_PORT,
        database=settings.MYSQL_DATABASE,
    )
    return create_engine(
        url,
        poolclass=NullPool,
        connect_args={
            "connect_timeout": 2,
            "read_timeout": 2,
            "write_timeout": 2,
        },
    )


def database_available() -> bool:
    try:
        engine = create_db_engine()
        if engine is None:
            return False
        with engine.connect() as connection:
            return connection.execute(text("SELECT 1")).scalar_one() == 1
    except Exception:
        # Health reports only availability; driver errors may contain credentials.
        return False
