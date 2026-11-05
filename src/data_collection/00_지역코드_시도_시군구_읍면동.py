import os
import pandas as pd
import requests
from dotenv import load_dotenv
from tqdm import tqdm

# 1. 환경 변수 로드 및 설정
load_dotenv()
API_KEY = os.getenv("API_KEY")  # .env에 저장된 인증키 불러오기
BASE_URL = "https://apis.data.go.kr"
URL = f"{BASE_URL}/1741000/StanReginCd/getStanReginCdList"

# 2. 요청 파라미터 설정
# ※ requests의 params를 사용할 때 serviceKey가 이중 인코딩되는 문제를 방지하기 위해 
#    serviceKey는 URL에 직접 결합하고, 나머지 파라미터를 params 딕셔너리에 담습니다.
request_url = f"{URL}?serviceKey={API_KEY}"

page_size = 100
params = {
    "numberOfRows": page_size,
    "pageNo": 1,
    "flag": "Y",
    "type": "json",
}

# 3. 데이터 수집을 위한 컬럼 매핑 딕셔너리
selected_columns_dict = {
    "sido_cd": "시도코드",
    "sgg_cd": "시군구코드",
    "umd_cd": "읍면동코드",
    "region_cd": "전체지역코드",
    "locatadd_nm": "전체 주소명",
}
selected_columns = list(selected_columns_dict.keys())

dfs = list()

# 4. 첫 번째 요청으로 전체 데이터 개수(total_count) 확인
res = requests.get(request_url, params=params)

if res.status_code == 200:
    try:
        data = res.json()
        # 구조 안전 확인
        if "StanReginCd" in data:
            total_count = int(data["StanReginCd"][0]["head"][0]["totalCount"])
            total_page = total_count // page_size + 1

            # 5. 전체 페이지 순회하며 데이터 수집
            for page in tqdm(range(1, total_page + 1), desc="행정구역 코드 수집 중"):
                params["pageNo"] = page
                try:
                    res = requests.get(request_url, params=params)
                    res.raise_for_status()
                    data = res.json()

                    # 응답 데이터 구조에 맞춰 row 추출
                    row_data = data["StanReginCd"][1]["row"]
                    station_df = pd.DataFrame(row_data)

                    # 필요한 컬럼만 추출하여 리스트에 추가
                    dfs.append(station_df[selected_columns])
                except Exception as e:
                    print(f"페이지 {page} 수집 중 오류: {e}")
        else:
            print(f"API 응답 구조 확인 필요: {data}")
    except Exception as e:
        print(f"데이터 파싱 오류: {e}")
else:
    print(f"code {res.status_code}: 데이터 수집 실패")

# 6. 데이터프레임 병합 및 전처리
if dfs:
    df = pd.concat(dfs, ignore_index=True)

    sido = df["sido_cd"].astype("string").str.zfill(2)
    sgg = df["sgg_cd"].astype("string").str.zfill(3)
    umd = df["umd_cd"].astype("string").str.zfill(3)

    df["sido_cd"] = sido

    # 시군구가 000이면 결측으로 둠
    df["sgg_cd"] = (sido + sgg).mask(sgg == "000")

    # 시군구나 읍면동이 000이면 결측으로 둠
    df["umd_cd"] = (sido + sgg + umd).mask((sgg == "000") | (umd == "000"))

    df["region_cd"] = df["region_cd"].astype("string").str.zfill(10)

    # 7. 결과 저장
    os.makedirs("data/results", exist_ok=True)
    df.to_csv(
        "data/results/region_code.csv", index=False, encoding="utf-8-sig"
    )
    print("성공적으로 'data/results/region_code.csv'에 저장되었습니다!")
else:
    print("수집된 데이터가 없습니다.")