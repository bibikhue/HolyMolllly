import os
import re
from urllib.parse import quote_plus

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = "."
SOURCE_DIR = f"{BASE_DIR}/source/기타"
FILE_NAME = "busan_festivals.csv"
# CSV에 조회 기준 월이 없어 적재 기준 월을 직접 지정합니다. 재실행 시 유지하세요.
BASE_YM = "2026-11"
# 기존 MICE ID와 구분하는 축제용 ID 범위
EVENT_ID_OFFSET = 3_000_000_000

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
        "UC_SEQ", "MAIN_TITLE", "MAIN_PLACE", "ADDR1", "PLACE",
        "USAGE_DAY", "USAGE_DAY_WEEK_AND_TIME",
    ],
    dtype="string",
    keep_default_na=False,
)
df = df.apply(lambda column: column.str.strip())
df = df.drop_duplicates()
df.head()

# 행사명에서 언어 안내만 제거 (BOF 등 실제 행사명 괄호는 유지)
df["event_nm"] = df["MAIN_TITLE"].str.replace(
    r"\(한[^)]*\)(?://.*)?$", "", regex=True
).str.strip()
df["event_id"] = EVENT_ID_OFFSET + pd.to_numeric(df["UC_SEQ"])
df["base_ym"] = BASE_YM
df["event_type_cd"] = 3
df["event_type_nm"] = "이벤트·공연"
df["place_nm"] = (
    df["MAIN_PLACE"].replace("", pd.NA)
    .fillna(df["ADDR1"].replace("", pd.NA))
    .fillna(df["PLACE"].replace("", pd.NA))
)
df["event_time"] = (
    df["USAGE_DAY_WEEK_AND_TIME"].replace("", pd.NA).fillna(df["USAGE_DAY"])
)
df["attachment_id"] = None
df["file_sn"] = None

# 일정 원문을 확인하고, 필요한 경우 아래에 날짜를 직접 보완합니다.
# 키: UC_SEQ, 값: (시작일, 종료일). 추측한 날짜는 넣지 않습니다.
DATE_OVERRIDES = {
    # "1705": ("YYYY-MM-DD", "YYYY-MM-DD"),
}

# 연도·월이 생략된 종료일은 시작일의 연도·월을 사용합니다.
# 월 단위 일정, 날짜 역전, 여러 개별 일정은 검토 대상으로 남깁니다.
parsed_dates = []
date_pattern = r"(?<!\d)(?:(\d{4})\s*[.년/-]\s*)?(\d{1,2})\s*[.월/-]\s*(\d{1,2})(?!\d)"
for row in df.to_dict("records"):
    schedule = row["event_time"]
    first_line = schedule.replace("\\n", "\n").split("\n", 1)[0]
    matches = re.findall(date_pattern, first_line)
    reason = ""
    start_date = pd.NaT
    end_date = pd.NaT
    if row["UC_SEQ"] in DATE_OVERRIDES:
        start_date, end_date = pd.to_datetime(list(DATE_OVERRIDES[row["UC_SEQ"]]))
    elif "PARK CONCERT" in schedule:
        reason = "여러 공연 일정: 날짜 직접 지정 필요"
    elif len(matches) in (1, 2) and matches[0][0]:
        year, month, day = matches[0]
        start_date = pd.to_datetime(f"{year}-{month}-{day}", errors="coerce")
        if len(matches) == 2:
            end_year, end_month, end_day = matches[1]
            end_date = pd.to_datetime(
                f"{end_year or year}-{end_month}-{end_day}", errors="coerce"
            )
        elif "~" not in first_line:
            end_date = start_date
    else:
        reason = "정확한 일자 없음 또는 일정 형식 확인 필요"
    if pd.isna(start_date) or pd.isna(end_date):
        reason = reason or "날짜 확인 필요"
    elif end_date < start_date:
        reason = "종료일이 시작일보다 빠름"
    parsed_dates.append((start_date, end_date, reason))

df[["start_date", "end_date", "review_reason"]] = pd.DataFrame(
    parsed_dates, index=df.index
)
review_df = df.loc[
    df["review_reason"].ne(""),
    ["UC_SEQ", "event_nm", "event_time", "review_reason"],
].copy()
review_df

# 날짜가 확인된 자료만 적재 대상으로 선택
df = df.loc[df["review_reason"].eq("")].copy()
df["start_date"] = pd.to_datetime(df["start_date"]).dt.date
df["end_date"] = pd.to_datetime(df["end_date"]).dt.date
df.to_csv("check.csv",index=False, encoding='utf-8-sig') 
# 기존 행사와 행사명·시작일·종료일이 같은 자료는 중복 등록하지 않음
# 기존 MICE 조회 월은 변경하지 않습니다.
existing_events = pd.read_sql(
    "SELECT event_nm, start_date, end_date FROM mice_events",
    con=engine,
)
existing_events["start_date"] = pd.to_datetime(existing_events["start_date"]).dt.date
existing_events["end_date"] = pd.to_datetime(existing_events["end_date"]).dt.date
existing_events["name_key"] = (
    existing_events["event_nm"].str.replace(r"\W", "", regex=True).str.casefold()
)
df["name_key"] = df["event_nm"].str.replace(r"\W", "", regex=True).str.casefold()
df = df.merge(
    existing_events[["name_key", "start_date", "end_date"]].drop_duplicates(),
    on=["name_key", "start_date", "end_date"],
    how="left",
    indicator=True,
)
duplicate_df = df.loc[df["_merge"].eq("both")].copy()
df = df.loc[df["_merge"].eq("left_only")].copy()
print(f"적재 {len(df)}건 / 기존 행사 중복 {len(duplicate_df)}건 / 날짜 검토 {len(review_df)}건")
df[["event_nm", "place_nm", "start_date", "end_date"]]

df["base_ym"] = pd.to_datetime(df["start_date"])
df["base_ym"] = df["base_ym"].dt.strftime("%Y-%m")
# DB 적재: 테이블은 DB 초기화 시 source.sql로 생성된 상태에서 실행
columns = [
    "event_id", "base_ym", "event_type_cd", "event_type_nm", "event_nm",
    "place_nm", "start_date", "end_date", "event_time", "attachment_id", "file_sn",
]
query = """
INSERT INTO mice_events (
    event_id, base_ym, event_type_cd, event_type_nm, event_nm, place_nm,
    start_date, end_date, event_time, attachment_id, file_sn
)
VALUES (
    :event_id, :base_ym, :event_type_cd, :event_type_nm, :event_nm, :place_nm,
    :start_date, :end_date, :event_time, :attachment_id, :file_sn
)
ON DUPLICATE KEY UPDATE
    event_nm = VALUES(event_nm), place_nm = VALUES(place_nm),
    start_date = VALUES(start_date), end_date = VALUES(end_date),
    event_time = VALUES(event_time)
"""

# df[columns].astype(object).where(df[columns].notna(), None).to_csv("check.csv",index=False, encoding='utf-8-sig') 
records = df[columns].astype(object).where(df[columns].notna(), None).to_dict("records")
with engine.begin() as con:
    for start in range(0, len(records), 1000):
        con.execute(text(query), records[start:start + 1000])

print(f"부산 축제 {len(df)}건 적재 완료")

# 적재 결과 확인
result_df = pd.read_sql(
    text("SELECT * FROM mice_events WHERE event_id >= :offset AND base_ym = :base_ym"),
    con=engine,
    params={"offset": EVENT_ID_OFFSET, "base_ym": BASE_YM},
)
result_df
