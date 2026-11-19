"""
TODO
관광데이터랩 소스의 자료들 마저 중복되는 데이터가 있으나, 판단하기 모호해서 보류하였음. 
향후 사이트 민원으로 들어올 때마다 처리할 예정
"""

import hashlib
import os
from urllib.parse import quote_plus

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = "."
SOURCE_DIR = f"{BASE_DIR}/source/기타"
FILE_NAME = "busan_attractions.csv"

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

# CSV 읽기: UC_SEQ는 재실행 시 같은 장소를 식별하기 위해 사용
df = pd.read_csv(
    f"{SOURCE_DIR}/{FILE_NAME}",
    encoding="utf-8-sig",
    usecols=[
        "UC_SEQ", "MAIN_TITLE", "GUGUN_NM", "LAT", "LNG", "ADDR1",
        "HOMEPAGE_URL", "USAGE_AMOUNT", "MAIN_IMG_NORMAL",
    ],
    dtype="string",
    keep_default_na=False,
)

# 컬럼명 통일
df = df.rename(
    columns={
        "UC_SEQ": "source_id",
        "MAIN_TITLE": "place_nm",
        "GUGUN_NM": "sgg_nm",
        "LAT": "latitude",
        "LNG": "longitude",
        "ADDR1": "address",
        "HOMEPAGE_URL": "hompage_url",
        "USAGE_AMOUNT": "usage_amount",
        "MAIN_IMG_NORMAL": "main_img",
    }
)
df = df.apply(lambda column: column.str.strip())
df = df.drop_duplicates()
df.head()

# 부산광역시 내 구군명으로 시군구 코드 연결
region_keys = pd.read_sql(
    """
    SELECT g.sgg_cd, g.sgg_nm
    FROM sigungu g
    JOIN sidos s ON g.sido_cd = s.sido_cd
    WHERE s.sido_nm = '부산광역시'
    """,
    con=engine,
)
set(region_keys["sgg_nm"].unique())-set(df["sgg_nm"].unique())
set(df["sgg_nm"].unique()) - set(region_keys["sgg_nm"].unique())
df.shape
df = df.merge(region_keys, on="sgg_nm", how="left", validate="many_to_one")
df[["place_nm", "sgg_nm", "sgg_cd"]].head()

# 신규 장소의 원천 식별자는 파일명과 UC_SEQ를 조합한 MD5 사용
df["source_poi_id"] = df["source_id"].map(
    lambda value: hashlib.md5(f"busan_attractions:{value}".encode("utf-8")).hexdigest()
)
df["poi_id"] = df["source_poi_id"].map(
    lambda value: hashlib.md5(f"tourism_places:{value}".encode("utf-8")).hexdigest()
)
df["place_type"] = "관광지"
df["category_nm"] = "부산명소"

# 기존 관광지와 구군·이름이 정확히 일치하면 기존 식별자 사용
# 이름이 다른 유사 장소는 자동 병합하지 않습니다.
place_keys = pd.read_sql(
    """
    SELECT poi_id AS existing_poi_id, source_poi_id AS existing_source_poi_id,
           sgg_cd, place_nm
    FROM tourism_places
    WHERE place_type = '관광지'
    """,
    con=engine,
)
place_keys = place_keys.merge(
    df[["sgg_cd", "place_nm"]].drop_duplicates(),
    on=["sgg_cd", "place_nm"], how="inner",
)
df = df.merge(place_keys, on=["sgg_cd", "place_nm"], how="left", validate="many_to_one")
matched_count = df["existing_poi_id"].notna().sum()
df["poi_id"] = df["existing_poi_id"].fillna(df["poi_id"])
df["source_poi_id"] = df["existing_source_poi_id"].fillna(df["source_poi_id"])

# 적재 대상 확인: 홈페이지·요금 등 빈 문자열은 SQL NULL로 처리
df = df[
    [
        "poi_id", "source_poi_id", "sgg_cd", "place_type", "place_nm",
        "category_nm", "latitude", "longitude",
        "address", "hompage_url", "usage_amount", "main_img",
    ]
]
df = df.replace("", pd.NA)
print(f"적재 대상 {len(df):,}건 / 기존 관광지 일치 {matched_count:,}건")
df.head()
# df.to_csv("check.csv",index=False, encoding='utf-8-sig') 
# DB 적재: 기존 관광지 ID·분류·좌표는 유지하고 상세정보만 보완
# 좌표가 없는 기존 장소에는 CSV 좌표를 채웁니다.
# 동일 원천 ID를 재실행하면 명칭·구군과 상세정보를 갱신합니다.
query = """
INSERT INTO tourism_places (
    poi_id, source_poi_id, sgg_cd, place_type, place_nm, category_nm,
    latitude, longitude, address, hompage_url, usage_amount, main_img
)
VALUES (
    :poi_id, :source_poi_id, :sgg_cd, :place_type, :place_nm, :category_nm,
    :latitude, :longitude, :address, :hompage_url, :usage_amount, :main_img
)
ON DUPLICATE KEY UPDATE
    sgg_cd = VALUES(sgg_cd),
    place_nm = VALUES(place_nm),
    latitude = COALESCE(latitude, VALUES(latitude)),
    longitude = COALESCE(longitude, VALUES(longitude)),
    address = COALESCE(VALUES(address), address),
    hompage_url = COALESCE(VALUES(hompage_url), hompage_url),
    usage_amount = COALESCE(VALUES(usage_amount), usage_amount),
    main_img = COALESCE(VALUES(main_img), main_img)
"""
records = df.astype(object).where(df.notna(), None).to_dict("records")
with engine.begin() as con:
    for start in range(0, len(records), 1000):
        con.execute(text(query), records[start:start + 1000])

print(f"부산명소 {len(df):,}건 적재 완료")

# 적재 결과 확인
result_df = pd.read_sql(
    "SELECT place_nm, sgg_cd, latitude, longitude, address, "
    "hompage_url, usage_amount, main_img "
    "FROM tourism_places WHERE main_img IS NOT NULL LIMIT 10",
    con=engine,
)
result_df

