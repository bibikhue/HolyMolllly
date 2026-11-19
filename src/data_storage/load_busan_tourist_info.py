import os
from urllib.parse import quote_plus

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = "."
SOURCE_DIR = f"{BASE_DIR}/source/기타"
FILE_NAME = "busan_tourist_info.csv"

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

# CSV 읽기
df = pd.read_csv(
    f"{SOURCE_DIR}/{FILE_NAME}",
    encoding="utf-8-sig",
    usecols=["NM", "LNG", "LAT", "OP_TIME", "ADDR1", "FGGG"],
    dtype="string",
    keep_default_na=False,
)
source_count = len(df)
df.head()

# 컬럼명 통일 및 전처리
df = df.rename(columns={
    "NM": "place_nm",
    "LNG": "longitude",
    "LAT": "latitude",
    "OP_TIME": "op_time",
    "ADDR1": "address",
    "FGGG": "supported_languages",
})
df = df.apply(lambda column: column.str.strip())
df = df.drop_duplicates(["place_nm", "longitude", "latitude"], keep="last")
df = df[
    ["place_nm", "longitude", "latitude", "op_time", "address", "supported_languages"]
]
df = df.replace("", pd.NA)

duplicate_count = source_count - len(df)
print(f"원본 {source_count:,}행 / 중복 {duplicate_count:,}행 / 적재 대상 {len(df):,}행")
df.head()

# DB 적재: 같은 안내소명과 좌표는 상세정보 갱신
# 테이블은 DB 초기화 시 source.sql로 생성된 상태에서 실행합니다.
query = """
INSERT INTO busan_tourist_info (
    place_nm, longitude, latitude, op_time, address, supported_languages
)
VALUES (
    :place_nm, :longitude, :latitude, :op_time, :address, :supported_languages
)
ON DUPLICATE KEY UPDATE
    op_time = VALUES(op_time),
    address = VALUES(address),
    supported_languages = VALUES(supported_languages)
"""
records = df.astype(object).where(df.notna(), None).to_dict("records")
with engine.begin() as con:
    for start in range(0, len(records), 1000):
        con.execute(text(query), records[start:start + 1000])

print(f"관광안내소 {len(df):,}건 적재 완료")

# 적재 결과 확인
result_df = pd.read_sql(
    "SELECT place_nm, longitude, latitude, op_time, address, supported_languages "
    "FROM busan_tourist_info ORDER BY place_nm LIMIT 10",
    con=engine,
)
result_df
