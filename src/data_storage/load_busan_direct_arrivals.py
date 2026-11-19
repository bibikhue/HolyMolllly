import os
from urllib.parse import quote_plus

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = "."
SOURCE_DIR = f"{BASE_DIR}/source/기타"
FILE_NAME = "부산직접입국_관광상용_2013_2026.csv"

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
    dtype="string",
    keep_default_na=False,
)
source_count = len(df)
df.head()

# 컬럼명 통일 및 전처리
df = df.rename(columns={
    "month": "base_ym",
    "nationality": "country_nm",
    "김해공항": "gimhae_airport_cnt",
    "부산항": "busan_port_cnt",
    "감천항": "gamcheon_port_cnt",
    "y_busan_tour_biz": "total_cnt",
})
df = df.apply(lambda column: column.str.strip())
df["base_ym"] = pd.to_datetime(df["base_ym"], format="%Y-%m").dt.strftime("%Y-%m")
df["country_nm"] = df["country_nm"].replace({
    "오스트레일리아": "호주",
    "러시아(연방)": "러시아",
    "터키": "튀르키예",
})
count_columns = ["gimhae_airport_cnt", "busan_port_cnt", "gamcheon_port_cnt", "total_cnt"]
df[count_columns] = df[count_columns].apply(pd.to_numeric)
df = df.drop_duplicates()
df.head()

# 기존 국가와 매칭, 신규 국가·국적 분류 확인
country_keys = pd.read_sql("SELECT country_id, country_nm FROM countries", con=engine)
new_countries = (
    df.loc[~df["country_nm"].isin(country_keys["country_nm"]), ["country_nm"]]
    .drop_duplicates()
)
# 구주기타·미상 등은 별도 분류로 보존, 국가 코드는 임의 생성하지 않음
new_countries
print(f"원본 {source_count:,}행 / 적재 대상 {len(df):,}행 / 신규 국가·분류 {len(new_countries)}개")

# DB 적재: 국가 추가와 통계 저장을 한 트랜잭션으로 처리
# 테이블은 DB 초기화 시 source.sql로 생성된 상태에서 실행합니다.
country_query = """
INSERT INTO countries (country_nm)
VALUES (:country_nm)
ON DUPLICATE KEY UPDATE country_nm = VALUES(country_nm)
"""
query = """
INSERT INTO busan_direct_arrivals (
    base_ym, country_id, gimhae_airport_cnt, busan_port_cnt, gamcheon_port_cnt, total_cnt
)
VALUES (
    :base_ym, :country_id, :gimhae_airport_cnt, :busan_port_cnt, :gamcheon_port_cnt, :total_cnt
)
ON DUPLICATE KEY UPDATE
    gimhae_airport_cnt = VALUES(gimhae_airport_cnt),
    busan_port_cnt = VALUES(busan_port_cnt),
    gamcheon_port_cnt = VALUES(gamcheon_port_cnt),
    total_cnt = VALUES(total_cnt)
"""
with engine.begin() as con:
    if not new_countries.empty:
        con.execute(text(country_query), new_countries.to_dict("records"))

    country_keys = pd.read_sql("SELECT country_id, country_nm FROM countries", con=con)
    arrivals = df.merge(country_keys, on="country_nm", how="left", validate="many_to_one")
    arrivals = arrivals[["base_ym", "country_id"] + count_columns]
    records = arrivals.to_dict("records")
    for start in range(0, len(records), 1000):
        con.execute(text(query), records[start:start + 1000])

print(f"부산 직접 입국 통계 {len(arrivals):,}건 적재 완료")

# 적재 결과 확인
result_df = pd.read_sql(
    """
    SELECT a.base_ym, c.country_nm, a.gimhae_airport_cnt,
           a.busan_port_cnt, a.gamcheon_port_cnt, a.total_cnt
    FROM busan_direct_arrivals a
    JOIN countries c ON a.country_id = c.country_id
    ORDER BY a.base_ym, c.country_nm
    LIMIT 10
    """,
    con=engine,
)
result_df
