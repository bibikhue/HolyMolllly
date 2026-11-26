import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.pool import QueuePool


load_dotenv("../.env")

engine = create_engine(
    URL.create(
        "mariadb+pymysql",
        username=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"],
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.environ["DB_PORT"]),
        database=os.environ["MYSQL_DATABASE"],
        query={"charset": "utf8mb4"},
    ),
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=15,
    pool_timeout=10,
    pool_recycle=1800,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)


def get_connection():
    return engine.begin()
