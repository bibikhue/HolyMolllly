import csv
import getpass
import sys
import time
import urllib.parse
import xml.etree.ElementTree as ET

import requests

API_URL = "https://apis.data.go.kr/6260000/BusanBIMS/busStopList"
OUTPUT_FILE = "bus_stops.csv"
ROWS_PER_PAGE = 1000


def local_name(tag):
    return tag.rsplit("}", 1)[-1]


def parse_response(xml_text):
    root = ET.fromstring(xml_text)

    result_code = root.findtext(".//resultCode")
    result_msg = root.findtext(".//resultMsg")
    if result_code and result_code != "00":
        raise RuntimeError(f"API 오류 {result_code}: {result_msg}")

    total_text = root.findtext(".//totalCount")
    total_count = int(total_text) if total_text and total_text.isdigit() else None

    rows = []
    for item in root.iter():
        if local_name(item.tag) == "item":
            row = {
                local_name(child.tag): child.text or ""
                for child in item
                if len(child) == 0
            }
            if row:
                rows.append(row)

    return rows, total_count


service_key = getpass.getpass("공공데이터포털 일반 인증키(Decoding)를 입력하세요: ").strip()
if not service_key:
    sys.exit("인증키를 입력하세요.")

# URL 인코딩된 키를 입력해도 중복 인코딩되지 않도록 처리
service_key = urllib.parse.unquote(service_key)

all_rows = []
page_no = 1
total_count = None

while total_count is None or len(all_rows) < total_count:
    params = {
        "serviceKey": service_key,
        "pageNo": page_no,
        "numOfRows": ROWS_PER_PAGE,
    }

    try:
        response = requests.get(API_URL, params=params, timeout=30)
        response.raise_for_status()
        rows, api_total_count = parse_response(response.text)
    except requests.RequestException as error:
        sys.exit(f"요청 실패: {error}\n{getattr(error.response, 'text', '')[:1000]}")
    except (ET.ParseError, RuntimeError, ValueError) as error:
        sys.exit(f"응답 처리 실패: {error}\n{response.text[:1000]}")

    if api_total_count is not None:
        total_count = api_total_count
    if not rows:
        break

    all_rows.extend(rows)
    print(f"{page_no}페이지 수신: {len(all_rows)} / {total_count or '?'}")
    page_no += 1
    time.sleep(0.1)

if not all_rows:
    sys.exit("저장할 데이터가 없습니다. 인증키와 API 활용 신청 상태를 확인하세요.")

columns = list(dict.fromkeys(key for row in all_rows for key in row))

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as file:
    writer = csv.DictWriter(file, fieldnames=columns)
    writer.writeheader()
    writer.writerows(all_rows)

print(f"{len(all_rows)}개 데이터를 {OUTPUT_FILE}에 저장했습니다.")