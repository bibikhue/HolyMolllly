import json
import os

from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import SQLAlchemyError

from nl2sql import OpenAIProvider
from repositories import planning_sql
from services import countries, country_clusters

RULES = """MariaDB 분석 SELECT 하나만 출력한다. CTE, 주석, 변수, 시스템 함수는 금지한다.
country_tourism_spending.spend_amt는 원, foreign_epay_spending.spend_amt는 천원이다. 억원 변환은 각각 100000000, 100000으로 나눈다.
제공한 스키마의 테이블·컬럼·코멘트만 사용하고 금액/방문 단위를 결과 컬럼 별칭에 표시한다.
방문 건수는 실인원이나 행사 참가자 수가 아니다. 외지인은 내국인 통계이며 외국인과 다르다.
성별·연령 대상은 visitor_demographics로 조회한다. 외국인의 성별·연령으로 해석하지 않는다.
외지인 대상 질문에 country_tourism_spending/foreign_epay_spending을 붙이지 않는다. 외국인 소비로 외지인 소비 성향을 판단할 수 없다.
사용자 대화의 최신 수정 조건을 따른다. 지역 미정이면 부산 16개 구군을 비교한다.
화면의 구군/국가 기본값은 행사 개최지/대상 확정 조건이 아니다. 언급과 확정을 구분한다.
분석 기간은 기본값이며 사용자가 명시한 기간이 우선이다. base_ym은 YYYY-MM 문자열이다.
봄 03~05, 여름 06~08, 가을 09~11, 겨울 12~02월. 계절 질문에는 해당 월로 집계한다.
사용자가 가을만 지정하면 09,10,11만 사용한다. 요청하지 않은 봄/여름 등을 임의로 포함하지 않는다.
서로 다른 사실 테이블은 각각 같은 차원으로 먼저 집계한 서브쿼리끼리 JOIN한다. 직접 JOIN해 중복 합산하지 않는다.
필요한 근거를 집계하여 최대 200행만 반환한다. 이름/단위를 표시하고 없는 수치는 만들지 않는다.
기본 집계와 산술, JOIN, 서브쿼리만 사용한다. SQL 이외 설명은 출력하지 않는다.
"""


def retrieve(question, filters, mode="planning"):
    from services.chatbot import request_response
    period = filters.get("period") or {}
    if not isinstance(period, dict):
        raise ValueError(400, "조회 기간을 확인해 주세요.")
    start, end = period.get("start_ym"), period.get("end_ym")
    countries.validate_filters(start, end, None, None)
    provider = OpenAIProvider(os.environ["OPENAI_API_KEY"], model=os.getenv("OPENAI_MODEL", "gpt-6-luna"))
    domains = planning_sql.query("SELECT DISTINCT age_group, gender FROM visitor_demographics")
    info = json.dumps({"columns": planning_sql.schema(), "demographic_values": domains["rows"], "default_analysis_period": period}, ensure_ascii=False)
    instructions = RULES
    if mode == "data":
        instructions += "\n현재는 일반 데이터 질문 모드이다. 행사 개최지나 후보 추천을 가정하지 말고 사용자 질문의 집계·비교를 수행한다. 지역을 지정하지 않았으면 부산 전체 기준으로 집계하고, 구군 비교를 요청한 경우에만 구군별로 나눈다."
    sql = provider.generate_sql(question, info, transport=request_response, instructions=instructions)
    try:
        data = planning_sql.query(sql)
    except SQLAlchemyError:
        raise ValueError(502, "분석 데이터 조회에 실패했습니다. 대상·지역·기간을 구체화해 다시 질문해 주세요.") from None
    documents = [{"source": "관광 데이터 DB 분석" if mode == "data" else "행사 기획 DB 분석", "title": "질문에 따른 관광 데이터 집계", "data": data,
                  "query": planning_sql.validate(sql),
                  "definitions": "visitor_demographics는 외지인 성별·연령별 방문 건수. tourist_counts는 국적별 외국인 방문객 수. 일반 관광소비액은 원, 간편결제 소비액은 천원. SQL의 WHERE 기간/월 조건을 확인해 집계 범위를 설명한다. SQL 자체는 사용자에게 출력하지 않는다."}]
    if any(word in question for word in ("군집", "유형화", "클러스터")):
        from repositories import sigungu
        named = [row for row in sigungu.get_sigungu("26") if row["sgg_nm"] in question]
        scope = max(named, key=lambda row: question.rfind(row["sgg_nm"]))["sgg_cd"] if named else None
        try:
            clusters = country_clusters.get_country_clusters(start, end, scope)
            documents.append({"source": "국가별 특성 유형화", "title": "국가별 군집 분석", "data": clusters})
        except ValueError as error:
            documents.append({"source": "국가별 특성 유형화", "title": "조회 제한", "data": {"reason": str(error.args[-1])}})
    context = jsonable_encoder({"mode": "data_question_nl2sql" if mode == "data" else "event_planning_nl2sql", "period": period, "documents": documents})
    if mode == "planning":
        context["location_note"] = "개최지는 사용자 발언에서 확정한 경우에만 확정이다. 미정이면 여러 구군을 비교 추천한다."
    if len(json.dumps(context, ensure_ascii=False).encode("utf-8")) > 120000:
        raise ValueError(413, "분석 결과가 너무 큽니다. 질문 범위를 좁혀 주세요.")
    return context
