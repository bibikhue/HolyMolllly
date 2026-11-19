import os
from urllib.parse import quote_plus

import geopandas as gpd
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = "."
SOURCE_DIR = f"{BASE_DIR}/source/기타"
FILE_NAME = "busan_walking_trails.csv"

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
    usecols=["UC_SEQ", "MAIN_TITLE", "LNG", "LAT", "MAIN_IMG_NORMAL"],
    dtype="string",
    keep_default_na=False,
)
source_count = len(df)
df.head()

# 컬럼명 통일 및 전처리
df = df.rename(columns={
    "UC_SEQ": "source_id",
    "MAIN_TITLE": "place_nm",
    "LNG": "longitude",
    "LAT": "latitude",
    "MAIN_IMG_NORMAL": "main_img",
})
df = df.apply(lambda column: column.str.strip())
df["longitude"] = pd.to_numeric(df["longitude"]).round(7)
df["latitude"] = pd.to_numeric(df["latitude"]).round(7)
df = df.drop_duplicates(["place_nm", "longitude", "latitude"], keep="last")
# 시군구 경계로 대표 좌표의 구군 매칭
# .prj가 없어 좌표 범위와 기존 관광 자료 대조를 근거로 EPSG:5179 적용
sig = gpd.read_file(
    f"{BASE_DIR}/source/sig_20230729/sig.shp", encoding="cp949"
)
sig = sig.set_crs("EPSG:5179")
sig = sig.loc[sig["SIG_CD"].str.startswith("26")].copy()
sig["geometry"] = sig.geometry.make_valid()
sig = sig.rename(columns={"SIG_CD": "sgg_cd", "SIG_KOR_NM": "sgg_nm"})

points = gpd.GeoDataFrame(
    df,
    geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
    crs="EPSG:4326",
).to_crs(sig.crs)
matched = gpd.sjoin(
    points, sig[["sgg_cd", "sgg_nm", "geometry"]],
    how="left", predicate="intersects",
)
df = pd.DataFrame(matched.drop(columns=["geometry", "index_right"]))
df["match_method"] = pd.Series("boundary", index=df.index).where(df["sgg_cd"].notna())

# 해변·교량 등 경계 밖 좌표는 동일 원천 자료의 구군으로 보완
# ID뿐 아니라 명칭·위경도도 모두 같은 자료만 사용
theme = pd.read_csv(
    f"{SOURCE_DIR}/busan_theme_trip.csv", encoding="utf-8-sig",
    usecols=["UC_SEQ", "MAIN_TITLE", "LAT", "LNG", "GUGUN_NM"],
    dtype="string", keep_default_na=False,
).rename(columns={
    "UC_SEQ": "source_id", "MAIN_TITLE": "place_nm", "GUGUN_NM": "theme_sgg_nm",
    "LAT": "latitude", "LNG": "longitude",
})
theme = theme.apply(lambda column: column.str.strip())
theme["latitude"] = pd.to_numeric(theme["latitude"]).round(7)
theme["longitude"] = pd.to_numeric(theme["longitude"]).round(7)
df = df.merge(
    theme, on=["source_id", "place_nm", "latitude", "longitude"],
    how="left", validate="many_to_one",
)
fallback = df["sgg_cd"].isna() & df["theme_sgg_nm"].notna()
region_codes = sig.set_index("sgg_nm")["sgg_cd"]
df.loc[fallback, "sgg_nm"] = df.loc[fallback, "theme_sgg_nm"]
df.loc[fallback, "sgg_cd"] = df.loc[fallback, "theme_sgg_nm"].map(region_codes)
df.loc[fallback & df["sgg_cd"].notna(), "match_method"] = "theme_trip"

# 매칭 근거와 미매칭 자료 확인. 원본 CSV는 수정하지 않음
match_df = df[
    ["place_nm", "sgg_cd", "sgg_nm", "longitude", "latitude", "main_img", "match_method"]
].copy()
unmatched_df = match_df.loc[match_df["sgg_cd"].isna()].copy()
match_df.to_csv(
    f"{SOURCE_DIR}/busan_walking_trails_구군매칭.csv", index=False, encoding="utf-8-sig"
)
print(match_df["match_method"].value_counts(dropna=False))
unmatched_df

# DB에는 구군명 대신 시군구 코드만 저장
df = df[["place_nm", "sgg_cd", "longitude", "latitude", "main_img"]]
df = df.replace("", pd.NA)

duplicate_count = source_count - len(df)
print(f"원본 {source_count:,}행 / 중복 {duplicate_count:,}행 / 적재 대상 {len(df):,}행")
df.head()

# DB 적재: 같은 명칭과 대표 좌표는 이미지 정보 갱신
# 테이블은 DB 초기화 시 source.sql로 생성된 상태에서 실행합니다.
query = """
INSERT INTO busan_walking_trails (place_nm, sgg_cd, longitude, latitude, main_img)
VALUES (:place_nm, :sgg_cd, :longitude, :latitude, :main_img)
ON DUPLICATE KEY UPDATE sgg_cd = VALUES(sgg_cd), main_img = VALUES(main_img)
"""
records = df.astype(object).where(df.notna(), None).to_dict("records")
with engine.begin() as con:
    for start in range(0, len(records), 1000):
        con.execute(text(query), records[start:start + 1000])

print(f"도보여행 {len(df):,}건 적재 완료")

# 적재 결과 확인
result_df = pd.read_sql(
    "SELECT place_nm, sgg_cd, longitude, latitude, main_img "
    "FROM busan_walking_trails ORDER BY place_nm LIMIT 10",
    con=engine,
)
result_df
