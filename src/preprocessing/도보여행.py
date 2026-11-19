import csv
import getpass
import sys
import time
import urllib.parse

import requests

API_URL = "https://apis.data.go.kr/6260000/WalkingService/getWalkingKr"
OUTPUT_FILE = "busan_walking_trails.csv"
ROWS_PER_PAGE = 100

service_key = getpass.getpass(
    "공공데이터포털 일반 인증키(Decoding)를 입력하세요: "
).strip()

if not service_key:
    sys.exit("인증키를 입력하세요.")

service_key = urllib.parse.unquote(service_key)

all_rows = []
page_no = 1
total_count = None

while total_count is None or len(all_rows) < total_count:
    params = {
        "ServiceKey": service_key,
        "pageNo": page_no,
        "numOfRows": ROWS_PER_PAGE,
        "resultType": "json",
    }

    try:
        response = requests.get(API_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        result = data.get("getWalkingKr", data)
        header = result.get("header", {})

        result_code = str(header.get("code", header.get("resultCode", "00")))
        result_message = header.get("message", header.get("resultMsg", ""))

        if result_code not in ("00", "0", "None", ""):
            sys.exit(f"API 오류 {result_code}: {result_message}")

        items = result.get("item", [])
        if isinstance(items, dict):
            items = [items]

        count = result.get("itemCnt", result.get("totalCount"))
        if count is not None:
            total_count = int(count)

    except requests.RequestException as error:
        sys.exit(
            f"요청 실패: {error}\n"
            f"{getattr(error.response, 'text', '')[:1000]}"
        )
    except (ValueError, TypeError, AttributeError) as error:
        sys.exit(f"응답 처리 실패: {error}\n{response.text[:1000]}")

    if not items:
        break

    all_rows.extend(items)
    print(f"{page_no}페이지 수신: {len(all_rows)} / {total_count or '?'}")
    page_no += 1
    time.sleep(0.1)

if not all_rows:
    sys.exit("저장할 데이터가 없습니다. 인증키와 API 활용 신청 상태를 확인하세요.")

columns = list(dict.fromkeys(key for row in all_rows for key in row.keys()))

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as file:
    writer = csv.DictWriter(file, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(all_rows)

print(f"{len(all_rows)}개 도보여행 정보를 {OUTPUT_FILE}에 저장했습니다.")