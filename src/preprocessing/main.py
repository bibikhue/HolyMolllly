import pandas as pd


FILE = f"source/김해공항_국적 및 월별 외국인 입국자_201801~202610.xlsx"

# 세 번째 열은 실제 성별 구분(총계/남성/여성), 월별 열의 값은 입국자 수입니다.
df = pd.read_excel(FILE, header=0, skiprows=[1])
df = df.rename(
    columns={"Unnamed: 0": "대륙", "Unnamed: 1": "국가", "Unnamed: 2": "성별"}
)
df = df.melt(
    id_vars=["대륙", "국가", "성별"],
    value_vars=[column for column in df.columns if str(column).isdigit()],
    var_name="연월",
    value_name="입국자수",
)
df = df[["대륙", "국가", "연월", "성별", "입국자수"]]
df = df[~df["성별"].isin(["총계", "제3의성"])]
df = df[df["국가"] != "총계"].reset_index(drop=True)

df.to_csv("김해공항_국적 및 월별 외국인 입국자_201801~202610.csv", index=False, encoding="utf-8-sig")


df = pd.read_csv(r"e:\MICE_CAMP\99_project_1team\HolyMolllly\sources\results\봉진 데이터\원 데이터\부산직접입국_관광상용_2013_2026.csv")
df.to_csv("부산직접입국_관광상용_2013_2026.csv", index=False, encoding="utf-8-sig")



####
df1 = pd.read_csv("source/콘서트/부산_콘서트_일정.csv")
df2 = pd.read_csv("source/콘서트/부산_콘서트_일정_공연장규모코드.csv")

df1_concert_idx = set(df1["공연번호"]) - set(df2["공연번호"])

df = pd.concat(
    [df1[df1["공연번호"].isin(df1_concert_idx)],
    df2[~df2["공연번호"].isin(df1_concert_idx)]], axis=0,  ignore_index=True
)
df = df.sort_values(by=[ "공연번호"])
df = df[~df["공연번호"].isin([1])].reset_index(drop=True)
df.to_csv("부산_콘서트_일정_통합.csv", index=False, encoding="utf-8-sig")
