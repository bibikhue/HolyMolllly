import csv
import getpass
import urllib.parse
import requests

url = "https://apis.data.go.kr/6260000/FoodieService/getFoodieKr"
key = urllib.parse.unquote(getpass.getpass("일반 인증키(Decoding): ").strip())
params = {
    "ServiceKey": key,
    "pageNo": 1,
    "numOfRows": 1000,
    "resultType": "json",
}

response = requests.get(url, params=params, timeout=30)
response.raise_for_status()

result = response.json()["getFoodieKr"]
items = result.get("item", [])
if isinstance(items, dict):
    items = [items]
if not items:
    raise SystemExit("데이터가 없습니다. 인증키와 API 활용 신청을 확인하세요.")

with open("busan_foodie_tour.csv", "w", newline="", encoding="utf-8-sig") as file:
    writer = csv.DictWriter(file, fieldnames=items[0].keys())
    writer.writeheader()
    writer.writerows(items)

print(f"{len(items)}개 데이터를 busan_foodie_tour.csv에 저장했습니다.")