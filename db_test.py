import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

print("Python 파일 실행 시작!", flush=True)

# 1. DB 연결 정보
db_url = URL.create(
    drivername="mysql+pymysql",
    username="root",
    password="hm123123",
    host="127.0.0.1",
    port=4567,
    database="hm_db"
)

# 2. DB 연결 엔진 생성
engine = create_engine(db_url)

# 3. SQL 쿼리 정의
query = """
SELECT
    base_ym,
    sgg_cd,
    nationality_id,
    tourist_cnt
FROM tourist_counts
"""

# 4. 데이터 조회
print("DB 연결 시도 중...", flush=True)

df = pd.read_sql(query, engine)

# 1. 연월별 데이터 건수 확인
monthly_count = df.groupby("base_ym").size()

print("\n[연월별 데이터 건수]")
print(monthly_count.to_string())

# 2. 중복 데이터 확인
duplicate_count = df.duplicated(
    subset=["base_ym", "sgg_cd", "nationality_id"]
).sum()

print("\n중복 데이터 건수:", duplicate_count)

# 3. 결측치 확인
print("\n[컬럼별 결측치]")
print(df.isnull().sum())

# 4. 관광객 수 기본 통계
print("\n[관광객 수 통계]")
print(df["tourist_cnt"].describe())


# 5. 결과 출력
print("전체 데이터 크기:", df.shape)
print("데이터 기간:", df["base_ym"].min(), "~", df["base_ym"].max())
print("국가 ID 목록:", sorted(df["nationality_id"].unique()))
print("시군구 개수:", df["sgg_cd"].nunique())
print(df.head())

# 1. 국가별·월별 관광객 수 집계
monthly_df = (
    df.groupby(
        ["base_ym", "nationality_id"],
        as_index=False
    )["tourist_cnt"]
    .sum()
)

# 2. 연월을 날짜형으로 변환
monthly_df["base_ym"] = pd.to_datetime(
    monthly_df["base_ym"],
    format="%Y-%m"
)

# 3. 국가와 날짜 기준으로 정렬
monthly_df = monthly_df.sort_values(
    ["nationality_id", "base_ym"]
)

# 4. 집계 결과 확인
print("\n[국가별 월별 관광객 수]")
print(monthly_df.head(15))

print("\n집계 후 데이터 크기:", monthly_df.shape)

# 국가 정보 테이블 조회
query_nationalities = """
SELECT *
FROM nationalities
"""

nationalities_df = pd.read_sql(
    query_nationalities,
    engine
)

print("\n[국가 정보 테이블]")
print(nationalities_df.to_string(index=False))

print("\n[컬럼명]")
print(nationalities_df.columns.tolist())

# 1. 국가별 관광객 수에 국가명 연결
merged_df = pd.merge(
    monthly_df,
    nationalities_df[["nationality_id", "nationality_nm"]],
    on="nationality_id",
    how="left",
    validate="many_to_one"
)

# 2. 분석 대상 9개국
target_countries = [
    "대만", "일본", "중국",
    "미국", "홍콩", "베트남",
    "태국", "필리핀", "싱가포르"
]

# 3. 분석 대상 외 국가를 기타로 분류
merged_df["country_group"] = merged_df["nationality_nm"].where(
    merged_df["nationality_nm"].isin(target_countries),
    "기타"
)

# 4. 월별·국가 그룹별 관광객 수 합산
final_df = (
    merged_df.groupby(
        ["base_ym", "country_group"],
        as_index=False
    )["tourist_cnt"]
    .sum()
)

# 5. 출력
print("\n[분석 대상 국가별 월별 관광객 수]")
print(final_df.head(20).to_string(index=False))

print("\n국가 그룹 목록:")
print(final_df["country_group"].unique())

print("\n최종 데이터 크기:", final_df.shape)

# 1. 국가별·연월별 정렬
final_df = final_df.sort_values(
    ["country_group", "base_ym"]
).reset_index(drop=True)

# 2. 정확히 전년 동월 데이터 연결
previous_df = final_df[
    ["base_ym", "country_group", "tourist_cnt"]
].copy()

previous_df["base_ym"] = (
    previous_df["base_ym"]
    + pd.DateOffset(years=1)
)

previous_df = previous_df.rename(
    columns={"tourist_cnt": "prev_year_cnt"}
)

model_df = final_df.merge(
    previous_df,
    on=["base_ym", "country_group"],
    how="left",
    validate="one_to_one"
)

# 3. 전년 동월 대비 증감률 계산
# 전년 동월 관광객 수가 0이면 계산하지 않음
model_df["growth_rate"] = (
    (model_df["tourist_cnt"] - model_df["prev_year_cnt"])
    / model_df["prev_year_cnt"].replace(0, float("nan"))
) * 100

# 4. 결과 확인
print("\n[국가별 관광객 증감률]")
print(
    model_df[
        ["base_ym", "country_group",
         "tourist_cnt", "prev_year_cnt", "growth_rate"]
    ]
    .query("base_ym >= '2024-01-01'")
    .head(20)
    .to_string(index=False)
)

print("\n증감률 결측치:", model_df["growth_rate"].isna().sum())

# 1. 2024년 이후 데이터만 추출
train_candidate_df = model_df[
    model_df["base_ym"] >= "2024-01-01"
].copy()

# 2. 증감률 결측치 제거
train_candidate_df = train_candidate_df.dropna(
    subset=["growth_rate"]
)

# 3. 연도와 월 파생변수 생성
train_candidate_df["year"] = (
    train_candidate_df["base_ym"].dt.year
)

train_candidate_df["month"] = (
    train_candidate_df["base_ym"].dt.month
)

# 4. 결과 확인
print("\n[회귀분석 학습 후보 데이터]")
print(train_candidate_df.head(15).to_string(index=False))

print("\n데이터 크기:", train_candidate_df.shape)

print("\n국가별 데이터 수:")
print(train_candidate_df.groupby("country_group").size())