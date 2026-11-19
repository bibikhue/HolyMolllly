import html
import os

import pandas as pd
import torch
from dotenv import load_dotenv
from transformers import AutoTokenizer
from langchain_community.document_loaders import DataFrameLoader
from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

BASE_DIR = "."
SOURCE_FILE = f"{BASE_DIR}/source/기타/busan_theme_trip.csv"
# 기존 직접 구현한 FAISS 파일은 유지하고 LangChain 형식으로 별도 저장
STORE_DIR = f"{BASE_DIR}/vector_store/busan_theme_trip_langchain"
MODEL_NAME = "jhgan/ko-sroberta-multitask"
MODEL_REVISION = "8fca7c9c98c26599be0e14b9916b11a756a26f19"
load_dotenv(f"{BASE_DIR}/.env")
LLM_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

# 데이터 읽기 및 전처리
df = pd.read_csv(
    SOURCE_FILE, encoding="utf-8-sig", dtype="string", keep_default_na=False,
    usecols=[
        "UC_SEQ", "MAIN_TITLE", "GUGUN_NM", "CATE2_NM", "TITLE", "SUBTITLE",
        "ITEMCNTNTS", "ADDR1", "LAT", "LNG", "MAIN_IMG_NORMAL", "HOMEPAGE_URL",
    ],
).rename(columns={
    "UC_SEQ": "source_id", "MAIN_TITLE": "place_nm", "GUGUN_NM": "sgg_nm",
    "CATE2_NM": "category_nm", "TITLE": "title", "SUBTITLE": "subtitle",
    "ITEMCNTNTS": "description", "ADDR1": "address",
    "LAT": "latitude", "LNG": "longitude",
    "MAIN_IMG_NORMAL": "main_img", "HOMEPAGE_URL": "homepage_url",
})
df = df.apply(lambda column: column.str.strip())
df["latitude"] = pd.to_numeric(df["latitude"])
df["longitude"] = pd.to_numeric(df["longitude"])
df["description"] = (
    df["description"].str.replace("\\n", " ", regex=False)
    .str.replace(r"<[^>]+>", " ", regex=True).map(html.unescape)
    .str.replace(r"\s+", " ", regex=True).str.strip()
)
df["text"] = (
    "코스명: " + df["place_nm"] + "\n지역: 부산 " + df["sgg_nm"]
    + "\n분류: " + df["category_nm"] + "\n"
    + df["title"] + "\n" + df["subtitle"] + "\n" + df["description"]
)
df = df.drop_duplicates("source_id").reset_index(drop=True)
df.head()

# 임베딩 모델: 로컬 캐시 사용, 다른 PC의 첫 다운로드 시 local_files_only=False
torch.set_num_threads(4)
embeddings_model = HuggingFaceEmbeddings(
    model_name=MODEL_NAME,
    model_kwargs={
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "revision": MODEL_REVISION,
        "local_files_only": True,
    },
    encode_kwargs={"normalize_embeddings": True, "batch_size": 32},
)

# DataFrame을 문서로 변환. 원천 ID·코스명·지역 등은 메타데이터로 보존
documents = DataFrameLoader(
    df[["text", "source_id", "place_nm", "sgg_nm", "category_nm",
        "latitude", "longitude", "address", "main_img"]],
    page_content_column="text",
).load()
tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME, revision=MODEL_REVISION, local_files_only=True,
)
# 이 토크나이저는 길이 측정용이며, 실제 임베딩은 100토큰 청크로 처리
tokenizer.model_max_length = 1_000_000
text_splitter = RecursiveCharacterTextSplitter.from_huggingface_tokenizer(
    tokenizer, chunk_size=100, chunk_overlap=20,
)
split_documents = text_splitter.split_documents(documents)

# 벡터 스토어 구축 및 저장: 원천이 변경됐을 때 실행
vectorstore = FAISS.from_documents(
    split_documents, embeddings_model,
    distance_strategy=DistanceStrategy.MAX_INNER_PRODUCT,
)
vectorstore.save_local(STORE_DIR)
df.to_json(f"{STORE_DIR}/documents.json", orient="records", force_ascii=False, indent=2)
print(f"{len(df)}개 코스 / {vectorstore.index.ntotal}개 청크 저장 완료")

# 저장된 벡터 스토어 불러오기: 검색만 할 때는 경로·임베딩 설정 후 여기부터 실행
# 직접 생성한 로컬 index.pkl만 불러옵니다.
db = FAISS.load_local(
    STORE_DIR, embeddings_model,
    allow_dangerous_deserialization=True,
    distance_strategy=DistanceStrategy.MAX_INNER_PRODUCT,
)
df = pd.read_json(f"{STORE_DIR}/documents.json", orient="records", dtype={"source_id": "string"})
df["latitude"] = pd.to_numeric(df["latitude"])
df["longitude"] = pd.to_numeric(df["longitude"])

# 코스 추천 요청
query = "부산에서 바다를 보며 걷기 좋은 코스를 3개 추천해줘"
COURSE_COUNT = 3
SGG_NM = None          # 예: "영도구". None이면 전체 지역
CATEGORY_NM = "도보여행"  # None이면 전체 분류
filters = {
    key: value for key, value in {"sgg_nm": SGG_NM, "category_nm": CATEGORY_NM}.items()
    if value is not None
}

# 검색 결과에서 서로 다른 코스를 선택
retriever = db.as_retriever(search_kwargs={
    "k": db.index.ntotal, "fetch_k": db.index.ntotal, "filter": filters or None,
})
retrieved_docs = retriever.invoke(query)
course_ids = pd.Series(
    [document.metadata["source_id"] for document in retrieved_docs], dtype="string",
).drop_duplicates().head(COURSE_COUNT).tolist()
recommend_df = df.set_index("source_id", drop=False).loc[course_ids].copy()
recommend_df[["place_nm", "sgg_nm", "address", "main_img"]]

# 검색된 코스 원문을 답변 근거로 사용
context = "\n\n".join(
    f"[원천 ID: {row.source_id}]\n{row.text}\n주소: {row.address}"
    for row in recommend_df.itertuples(index=False)
)
prompt = ChatPromptTemplate.from_messages([
    ("system", """당신은 부산 여행 코스 추천 도우미입니다.
제공된 자료의 코스만 추천하고 각 추천의 source_id를 정확히 반환하세요.
text에는 '코스명 / 지역 / 추천 이유 / 주요 방문지'를 하나의 문자열로 작성하세요.
본문에 명시된 방문 순서가 있을 때만 순서를 제시하세요.
자료에 없는 이동 시간, 무장애 여부, 운영시간, 가격은 추측하지 마세요.
조건에 맞지 않는 코스는 제외하고, 같은 코스를 중복 추천하지 마세요.
지역과 좌표는 원천의 대표 지점이며 전체 코스 경로를 의미하지 않습니다."""),
    ("human", "요청: {query}\n\n관광 자료:\n{context}"),
])

# 추천 문장과 원천 ID만 LLM에서 받고, 좌표는 원본 데이터에서 연결
response_schema = {
    "title": "CourseRecommendations",
    "type": "object",
    "properties": {
        "courses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source_id": {"type": "string", "enum": course_ids},
                    "text": {"type": "string"},
                },
                "required": ["source_id", "text"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["courses"],
    "additionalProperties": False,
}

# OPENAI_API_KEY를 환경변수 또는 루트 .env에 설정한 뒤 실행
# 검색 결과가 없으면 LLM 호출 없이 빈 목록 반환
if course_ids:
    llm = ChatOpenAI(model=LLM_MODEL, temperature=0)
    recommend_chain = prompt | llm.with_structured_output(
        response_schema, method="json_schema", strict=True,
    )
    response = recommend_chain.invoke({"query": query, "context": context})
    recommended = pd.DataFrame(response["courses"], columns=["source_id", "text"])
    recommended = recommended.drop_duplicates("source_id")
else:
    recommended = pd.DataFrame(columns=["source_id", "text"])

# ID 기준으로 원본 메타정보 연결. 추천 순서와 metadata 순서는 동일
recommended = recommended.merge(
    df[["source_id", "place_nm", "sgg_nm", "latitude", "longitude", "address", "main_img"]],
    on="source_id", how="left", validate="many_to_one",
)
answer: list[str] = recommended["text"].tolist()
metadata = recommended[
    ["source_id", "place_nm", "sgg_nm", "latitude", "longitude", "address", "main_img"]
].to_dict("records")
result = {"answer": answer, "metadata": metadata}
result
