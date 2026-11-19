import os
from urllib.parse import quote_plus

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = "."
SOURCE_DIR = f"{BASE_DIR}/source/기타"
FILE_NAME = "busan_shopping.csv"

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
    usecols=[
        "MAIN_TITLE", "GUGUN_NM", "LAT", "LNG",
        "ADDR1", "HOMEPAGE_URL", "MAIN_IMG_NORMAL",
    ],
    dtype="string",
    keep_default_na=False,
)
source_count = len(df)
df.head()

# 컬럼명 통일 및 전처리
df = df.rename(
    columns={
        "MAIN_TITLE": "place_nm",
        "GUGUN_NM": "sgg_nm",
        "LAT": "latitude",
        "LNG": "longitude",
        "ADDR1": "address",
        "HOMEPAGE_URL": "hompage_url",
        "MAIN_IMG_NORMAL": "main_img",
    }
)
df = df.apply(lambda column: column.str.strip())
df = df.drop_duplicates(["place_nm", "sgg_nm", "longitude", "latitude"], keep="last")

# 부산광역시 구군명을 기존 시군구 코드로 매칭
region_keys = pd.read_sql(
    """
    SELECT g.sgg_cd, g.sgg_nm
    FROM sigungu g
    JOIN sidos s ON g.sido_cd = s.sido_cd
    WHERE s.sido_nm = '부산광역시'
    """,
    con=engine,
)
df = df.merge(region_keys, on="sgg_nm", how="left", validate="many_to_one")
df[["place_nm", "sgg_nm", "sgg_cd"]].head()

# 적재 대상 확인: 비어 있는 주소와 홈페이지는 NULL로 저장
df = df[
    [
        "place_nm", "sgg_cd", "longitude", "latitude",
        "address", "hompage_url", "main_img",
    ]
]
df = df.replace("", pd.NA)
print(f"원본 {source_count:,}행 / 적재 대상 {len(df):,}행")
df.head()
df.to_csv("check.csv",index=False, encoding='utf-8-sig') 

# DB 적재: 명칭·시군구·좌표가 같으면 상세정보 갱신
# 테이블은 DB 초기화 시 source.sql로 생성된 상태에서 실행합니다.
query = """
INSERT INTO busan_shopping (
    place_nm, sgg_cd, longitude, latitude,
    address, hompage_url, main_img
)
VALUES (
    :place_nm, :sgg_cd, :longitude, :latitude,
    :address, :hompage_url, :main_img
)
ON DUPLICATE KEY UPDATE
    place_nm = VALUES(place_nm),
    sgg_cd = VALUES(sgg_cd),
    longitude = VALUES(longitude),
    latitude = VALUES(latitude),
    address = VALUES(address),
    hompage_url = VALUES(hompage_url),
    main_img = VALUES(main_img)
"""
records = df.astype(object).where(df.notna(), None).to_dict("records")
with engine.begin() as con:
    for start in range(0, len(records), 1000):
        con.execute(text(query), records[start:start + 1000])

print(f"쇼핑 장소 {len(df):,}건 적재 완료")

# 적재 결과 확인
result_df = pd.read_sql(
    "SELECT * FROM busan_shopping ORDER BY place_nm, sgg_cd LIMIT 10",
    con=engine,
)
result_df
