"""Bounded read-only analysis queries. SQLAlchemy Core only, no ORM."""
import re

import sqlglot
from sqlglot import exp
from sqlalchemy import text

from db import engine

TABLES = frozenset({"sigungu", "countries", "tourist_counts", "country_tourism_spending", "visitor_demographics", "foreign_epay_spending", "tourism_detail_industries", "tourism_industries", "tourism_contents", "tourism_interest_counts"})


def schema():
    with engine.connect() as connection:
        rows = connection.execute(text("""
            SELECT c.TABLE_NAME, c.COLUMN_NAME, c.COLUMN_TYPE, c.COLUMN_COMMENT, t.TABLE_COMMENT
            FROM information_schema.COLUMNS c
            JOIN information_schema.TABLES t ON t.TABLE_SCHEMA=c.TABLE_SCHEMA AND t.TABLE_NAME=c.TABLE_NAME
            WHERE c.TABLE_SCHEMA=DATABASE() ORDER BY c.TABLE_NAME,c.ORDINAL_POSITION
        """)).mappings().all()
    return [dict(row) for row in rows if row["TABLE_NAME"] in TABLES]


def validate(sql):
    if len(sql) > 16000 or re.search(r"--|/\*|#|@|\b(INTO|OUTFILE|DUMPFILE|LOCK|PROCEDURE|SLEEP|BENCHMARK)\b|\bFOR\s+UPDATE\b", sql, re.I):
        raise ValueError(400, "허용되지 않은 분석 조회문입니다.")
    try:
        statements = sqlglot.parse(sql, read="mysql")
    except sqlglot.errors.ParseError:
        raise ValueError(400, "분석 조회문을 해석하지 못했습니다.") from None
    if len(statements) != 1 or not isinstance(statements[0], exp.Select):
        raise ValueError(400, "SELECT 조회만 가능합니다.")
    tree = statements[0]
    functions = {"SUM", "COUNT", "AVG", "MIN", "MAX", "ROUND", "COALESCE", "NULLIF", "IF", "IFNULL", "ABS", "SUBSTRING", "MONTH", "YEAR", "CAST", "CONCAT", "DATE_FORMAT", "STR_TO_DATE", "LN", "LOG", "POWER", "SQRT", "ROW_NUMBER", "RANK", "DENSE_RANK", "LAG", "LEAD", "AND", "OR"}
    for node in tree.walk():
        if isinstance(node, exp.Func):
            name = node.name.upper() if isinstance(node, exp.Anonymous) else node.sql_name().upper()
            if name not in functions:
                raise ValueError(400, "허용되지 않은 SQL 함수입니다.")
        if isinstance(node, (exp.Insert, exp.Update, exp.Delete, exp.Create, exp.Drop, exp.Command, exp.Into, exp.With)):
            raise ValueError(400, "허용되지 않은 SQL 구문입니다.")
    tables = list(tree.find_all(exp.Table))
    if not tables or any(t.name not in TABLES or t.db or t.catalog for t in tables):
        raise ValueError(400, "허용된 관광 분석 테이블만 조회할 수 있습니다.")
    return tree.sql(dialect="mysql")


def query(sql):
    sql = validate(sql)
    with engine.connect() as connection:
        try:
            connection.exec_driver_sql("START TRANSACTION READ ONLY")
            result = connection.execute(text(f"SET STATEMENT max_statement_time=5 FOR SELECT * FROM ({sql}) AS planning_result LIMIT 201"))
            rows = [dict(row) for row in result.mappings().all()]
            return {"rows": rows[:200], "truncated": len(rows) > 200}
        finally:
            connection.rollback()
