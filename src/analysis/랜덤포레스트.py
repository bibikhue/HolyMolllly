import pandas as pd
import numpy as np
from sqlalchemy import create_engine

from sklearn.ensemble import RandomForestRegressor

from sklearn.metrics import (mean_absolute_error, mean_squared_error)

# 데이터베이스 연결
engine = create_engine(
    "mysql+pymysql://hm_user:hm_passwd@localhost:4567/hm_db"
)

# 테이블 불러오기 
tourist_df = pd.read_sql("select * from tourist_counts", engine)
countries_df = pd.read_sql("select * from countries where country_id <=25", engine)

# 국가 데이터 결합
df = pd.merge(
    tourist_df,
    countries_df,
    on="country_id",
    how="left"
)

# 국가 9개국 + 기타 분류
main_countries = ["대만","미국","베트남","싱가포르","일본","중국","태국","필리핀","홍콩"]

df["country_nm"] = df["country_nm"].apply(
    lambda x: x if x in main_countries else "기타"
)

# 월별, 국가별 관광객 수 합산
df_tourist = (
    df.groupby(
        ["base_ym","country_nm"],
        as_index=False
    )["tourist_cnt"].sum()
)

# 기준월 날짜형태로 변경
df_tourist["base_ym"] = pd.to_datetime(df_tourist["base_ym"])

# 파생변수
df = df_tourist.copy()

df = df.sort_values(
    ["country_nm","base_ym"]
).reset_index(drop=True)

# 연도, 월
df["month"] = df["base_ym"].dt.month
df["year"] = df["base_ym"].dt.year

# 전년 동월 관광객 수
df["prev_year_cnt"] = (
    df.groupby("country_nm")["tourist_cnt"]
    .shift(12)
)

# 전년 동월 대비 증감률
df["growth_rate"] = (
    (df["tourist_cnt"] - df["prev_year_cnt"]) / df["prev_year_cnt"] * 100)

####################################################################################
# 학습/평가데이터
train = df[
    (df["base_ym"] >= "2024-01-01") &
    (df["base_ym"] < "2026-01-01")
].reset_index(drop=True)
test = df[
    (df["base_ym"] >= "2026-01-01") &
    (df["base_ym"] < "2026-09-01")
].reset_index(drop=True)


# 독립/종속변수
X_train = train.drop(["base_ym","tourist_cnt","growth_rate"], axis=1)
X_test = test.drop(["base_ym","tourist_cnt","growth_rate"], axis=1)

X_train = pd.get_dummies(
    X_train,
    columns=["country_nm"],
    dtype=int
)
X_test = pd.get_dummies(
    X_test,
    columns=["country_nm"],
    dtype=int
)

y_train = train["growth_rate"]
y_test = test["growth_rate"]

######################################################################################################
# 랜덤포레스트 모델
rf_model = RandomForestRegressor(random_state=42)

rf_model.fit(X_train, y_train)

rf_pred = rf_model.predict(X_test) # 예측

mean_absolute_error(y_test, rf_pred) # mae 2023: 47.67 / 2024: 46.94
np.sqrt(mean_squared_error(y_test, rf_pred)) # rmse 2023: 74.58 / 2024 : 74.14


