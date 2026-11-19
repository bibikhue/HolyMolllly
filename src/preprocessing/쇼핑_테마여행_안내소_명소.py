import csv
import getpass
import urllib.parse
import requests

key = urllib.parse.unquote(getpass.getpass("일반 인증키(Decoding): ").strip())

apis = {
    "shopping": "ShoppingService/getShoppingKr",
    "theme_trip": "RecommendedService/getRecommendedKr",
    "tourist_info": "InfoOfficeService/getInfoOfficeKr",
    "attractions": "AttractionService/getAttractionKr",
}

for name, endpoint in apis.items():
    url = f"https://apis.data.go.kr/6260000/{endpoint}"
    params = {
        "ServiceKey": key,
        "pageNo": 1,
        "numOfRows": 1000,
        "resultType": "json",
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    result = response.json()[endpoint.split("/")[-1]]
    items = result.get("item", [])
    if isinstance(items, dict):
        items = [items]

    if items:
        with open(f"busan_{name}.csv", "w", newline="", encoding="utf-8-sig") as file:
            writer = csv.DictWriter(file, fieldnames=items[0].keys())
            writer.writeheader()
            writer.writerows(items)