import os
from urllib.parse import quote_plus

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = "."
SOURCE_DIR = f"{BASE_DIR}/source/기타"
FILE_NAME = "bus_stops.csv"

# DB 연결
load_dotenv(f"{BASE_DIR}/database/.env")
PORT = os.getenv("DB_PORT", "3306")
USER = os.getenv("MYSQL_USER")
DATABASE = os.getenv("MYSQL_DATABASE")
PW = os.getenv("MYSQL_PASSWORD")
HOST = os.getenv("DB_HOST", os.getenv("HOST", "localhost"))

DB_INFO = (
    f"mysql+pymysql://{quote_plus(USER)}:{quote_plus(PW)}"
    f"@{HOST}:{PORT}/{quote_plus(DATABASE)}?charset=utf8mb4"
)
engine = create_engine(DB_INFO, pool_pre_ping=True)

# CSV 읽기: 정류소명, 경도, 위도만 사용
df = pd.read_csv(
    f"{SOURCE_DIR}/{FILE_NAME}",
    encoding="utf-8-sig",
    usecols=["bstopnm", "gpsx", "gpsy"],
    dtype="string",
    keep_default_na=False,
)
source_count = len(df)
df.head()

# 컬럼명 통일 및 전처리
df = df.rename(
    columns={
        "bstopnm": "station_name",
        "gpsx": "longitude",
        "gpsy": "latitude",
    }
)
df = df.apply(lambda column: column.str.strip())

df["longitude"] = pd.to_numeric(df["longitude"], errors="raise")
df["latitude"] = pd.to_numeric(df["latitude"], errors="raise")

df = df[["station_name", "longitude", "latitude"]].drop_duplicates()

duplicate_count = source_count - len(df)
print(f"원본 {source_count:,}행 / 중복 {duplicate_count:,}행 / 적재 대상 {len(df):,}행")
df.head()

# DB 적재: 같은 정류소명과 좌표는 재실행 시 중복 저장하지 않음
query = """
INSERT INTO bus_stops (station_name, longitude, latitude)
VALUES (:station_name, :longitude, :latitude)
ON DUPLICATE KEY UPDATE station_name = VALUES(station_name)
"""
records = df.to_dict("records")
with engine.begin() as con:
    for start in range(0, len(records), 1000):
        con.execute(text(query), records[start:start + 1000])

print(f"버스 정류소 {len(df):,}개 적재 완료")

# 적재 결과 확인
result_df = pd.read_sql(
    "SELECT station_name, longitude, latitude "
    "FROM bus_stops ORDER BY station_name, longitude, latitude LIMIT 10",
    con=engine,
)
result_df
