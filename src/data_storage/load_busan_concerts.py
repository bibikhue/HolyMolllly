"""
TODO

중복 데이터 존재할 것으로 예상 확인 필요
"""

import os
from urllib.parse import quote_plus

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import bindparam, create_engine, text

BASE_DIR = "."
SOURCE_DIR = f"{BASE_DIR}/source/기타"
FILE_NAME = "부산_콘서트_일정_통합.csv"
# 원천 공연번호(최대 2,026,100,193)에 더해 기존 MICE·축제 ID와 구분
EVENT_ID_OFFSET = 2_100_000_000

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

# 원본 확인: 유무료·객석 정보는 현재 mice_events에 대응 컬럼이 없음
source_df = pd.read_csv(
    f"{SOURCE_DIR}/{FILE_NAME}",
    encoding="utf-8-sig",
    dtype="string",
    keep_default_na=False,
)
source_df = source_df.apply(lambda column: column.str.strip())
source_df.head()

# 컬럼명 통일
df = source_df[
    ["공연번호", "공연명", "공연시작일", "공연종료일", "공연장", "공연장_표준명"]
].rename(
    columns={
        "공연번호": "source_id",
        "공연명": "event_nm",
        "공연시작일": "start_date",
        "공연종료일": "end_date",
        "공연장": "source_place_nm",
        "공연장_표준명": "standard_place_nm",
    }
)
df["event_id"] = EVENT_ID_OFFSET + pd.to_numeric(df["source_id"])
# INT UNSIGNED 범위와 중복 ID는 잘못된 갱신을 막기 위해 확인
if not df["event_id"].between(0, 4_294_967_295).all() or df["event_id"].duplicated().any():
    raise ValueError("공연번호 중복 또는 event_id 범위를 확인하세요.")

df["start_date"] = pd.to_datetime(df["start_date"], format="%Y-%m-%d", errors="coerce")
df["end_date"] = pd.to_datetime(df["end_date"], format="%Y-%m-%d", errors="coerce")
review_df = df.loc[
    df["start_date"].isna() | df["end_date"].isna()
    | df["start_date"].gt(df["end_date"])
].copy()
review_df

# 축제 적재 코드와 동일하게 공연 시작 월을 base_ym으로 사용
# 기존 스키마 주석의 '조회 기준 연월'과 의미가 다름에 주의
df = df.drop(index=review_df.index).copy()
df["base_ym"] = df["start_date"].dt.strftime("%Y-%m")
df["start_date"] = df["start_date"].dt.date
df["end_date"] = df["end_date"].dt.date
df["place_nm"] = df["standard_place_nm"].replace("", pd.NA).fillna(df["source_place_nm"])
df["event_type_cd"] = 3
df["event_type_nm"] = "이벤트·공연"
# 원본에 공연 시각·MICE 첨부파일 번호는 없음
df["event_time"] = None
df["attachment_id"] = None
df["file_sn"] = None

# 이름·날짜가 같아도 공연장이 다르면 별도 행사로 유지
df["name_key"] = df["event_nm"].str.replace(r"\W", "", regex=True).str.casefold()
df["place_key"] = df["place_nm"].str.replace(r"\W", "", regex=True).str.casefold()
# keys = ["name_key", "start_date", "end_date", "place_key"]
# source_duplicate_df = df.loc[df.duplicated(keys, keep="first")].copy()
check_list = (df[["event_nm","start_date"]].value_counts()!=1)
check_list = check_list[check_list==True].reset_index()["event_nm"]
# df.iloc[
#     df["event_nm"].isin(check_list)].to_csv("check.csv", encoding='utf-8-sig')

# df.to_csv("check.csv", encoding='utf-8-sig')
df = df.drop_duplicates(["event_nm","start_date"], keep="first")

# 기존 행사와 비교: 같은 원천 ID는 업서트 대상으로 유지
existing_events = pd.read_sql(
    "SELECT event_id, event_nm, place_nm, start_date, end_date FROM mice_events",
    con=engine,
)
# 기존 데이터 전체 컬럼을 보존하고, 최신 조회 월의 행을 우선 유지
existing_events = pd.read_sql("SELECT * FROM mice_events", con=engine)
existing_count = len(existing_events)
# 보관하는 행사명은 유지하고 비교용 이름만 통일
for frame in [existing_events, df]:
    frame["dedup_name"] = (
        frame["event_nm"].str.replace("\\u3000", " ", regex=False)
        .str.normalize("NFKC")
        .str.replace(r"\s+", " ", regex=True).str.strip().str.casefold()
    )

existing_events["start_date"] = pd.to_datetime(existing_events["start_date"]).dt.date
existing_events = existing_events.sort_values(
    ["base_ym", "event_id"], ascending=[False, True], kind="stable"
)
keys = ["dedup_name", "start_date"]
existing_duplicate_df = existing_events.loc[
    existing_events.duplicated(keys, keep="first")
].copy()
existing_events = existing_events.drop_duplicates(keys, keep="first").copy()

# 실제 삭제 대상 확인: 같은 공연의 과거 조회 월도 중복으로 정리됩니다.
existing_duplicate_df[["event_id", "base_ym", "event_nm", "start_date"]]
print(f"기존 중복 삭제 대상 {len(existing_duplicate_df):,}건")

# 공연명·시작일로 신규 자료와 기존 자료 비교
keys = ["dedup_name", "start_date"]
df = df.drop_duplicates(keys, keep="first").copy()
source_duplicate_count = len(source_df) - len(review_df) - len(df)

# 다른 원천 행사와 ID가 겹치면 덮어쓰지 않고 확인
id_conflicts = df.merge(
    existing_events[["event_id", "event_nm"]].drop_duplicates(),
    on="event_id", suffixes=("", "_existing"), how="inner",
)
id_conflicts = id_conflicts.loc[id_conflicts["event_nm"].ne(id_conflicts["event_nm_existing"])]
if not id_conflicts.empty:
    raise ValueError("기존 행사와 event_id가 충돌합니다. id_conflicts를 확인하세요.")

# 같은 원천 ID는 업서트하고, 다른 ID의 같은 공연은 중복 등록하지 않음
other_events = existing_events.loc[~existing_events["event_id"].isin(df["event_id"])]
df = df.merge(
    other_events[keys].drop_duplicates(), on=keys, how="left", indicator=True
)
duplicate_df = df.loc[df["_merge"].eq("both")].copy()
df = df.loc[df["_merge"].eq("left_only")].drop(columns="_merge").copy()

print(
    f"원본 {len(source_df):,}건 / 원본 중복 {source_duplicate_count}건 / "
    f"날짜 검토 {len(review_df)}건 / 기존 행사 중복 {len(duplicate_df)}건 / 적재 {len(df):,}건"
)
df[["event_id", "base_ym", "event_nm", "place_nm", "start_date", "end_date"]]

# DB 적재: 기존 테이블에 행사 행만 추가, 동일 키는 갱신
columns = [
    "event_id", "base_ym", "event_type_cd", "event_type_nm", "event_nm",
    "place_nm", "start_date", "end_date", "event_time", "attachment_id", "file_sn",
]
query = """
INSERT INTO mice_events (
    event_id, base_ym, event_type_cd, event_type_nm, event_nm,
    place_nm, start_date, end_date, event_time, attachment_id, file_sn
)
VALUES (
    :event_id, :base_ym, :event_type_cd, :event_type_nm, :event_nm,
    :place_nm, :start_date, :end_date, :event_time, :attachment_id, :file_sn
)
ON DUPLICATE KEY UPDATE
    event_nm = VALUES(event_nm), place_nm = VALUES(place_nm),
    start_date = VALUES(start_date), end_date = VALUES(end_date)
"""
records = df[columns].astype(object).where(df[columns].notna(), None).to_dict("records")
delete_query = text("""
DELETE FROM mice_events
WHERE event_id = :event_id AND base_ym = :base_ym
  AND event_nm = :event_nm AND start_date = :start_date
""")
delete_records = existing_duplicate_df[
    ["event_id", "base_ym", "event_nm", "start_date"]
].to_dict("records")

# 기존 중복 삭제와 신규 적재를 한 트랜잭션으로 처리
deleted_count = 0
with engine.begin() as con:
    for start in range(0, len(delete_records), 1000):
        deleted_count += con.execute(delete_query, delete_records[start:start + 1000]).rowcount
    for start in range(0, len(records), 1000):
        con.execute(text(query), records[start:start + 1000])

print(f"부산 콘서트 {len(df):,}건 적재 완료")
print(f"Existing rows: {existing_count:,}; planned deletes: {len(delete_records):,}; actual deletes: {deleted_count:,}")
with engine.connect() as con:
    total_count = con.execute(text("SELECT COUNT(*) FROM mice_events")).scalar_one()
print(f"DB total after commit: {total_count:,}")

# 적재 결과 확인
result_df = pd.read_sql(
    text("SELECT event_id, base_ym, event_nm, place_nm, start_date, end_date "
         "FROM mice_events WHERE event_id IN :event_ids LIMIT 10").bindparams(
        bindparam("event_ids", expanding=True)
    ),
    con=engine,
    params={"event_ids": df["event_id"].head(10).tolist()},
)
result_df

result_df = pd.read_sql(
    text("SELECT event_id, base_ym, event_nm, place_nm, start_date, end_date "
        "FROM mice_events;"),
        con=engine,
)

result_df