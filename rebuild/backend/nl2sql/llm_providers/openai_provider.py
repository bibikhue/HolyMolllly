import openai
from typing import Dict, Any, Optional
from .base import BaseLLMProvider

class OpenAIProvider(BaseLLMProvider):
    """OpenAI LLM provider for SQL generation."""
    
    def __init__(self, api_key: str, model: str = "gpt-4o", **kwargs):
        super().__init__(api_key, **kwargs)
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model

    def list_models(self):
        """Return GPT text models visible to the configured API key."""
        excluded = ("audio", "realtime", "transcribe", "tts", "image", "search", "codex")
        ids = {model.id for model in self.client.models.list()
               if model.id.startswith("gpt-") and not any(word in model.id for word in excluded)}
        return [{"id": identifier, "name": identifier} for identifier in sorted(ids, reverse=True)]
    
    def generate_sql(self, question: str, schema_info: str, **kwargs) -> str:
        """Generate SQL query using OpenAI GPT models."""
        if transport := kwargs.get("transport"):
            payload = {"model": self.model, "instructions": kwargs["instructions"],
                       "input": f"Schema:\n{schema_info}\nQuestion:\n{question}",
                       "max_output_tokens": 4000, "store": False}
            if self.model.startswith("gpt-6"):
                payload["reasoning"] = {"effort": "low"}
            result = transport(payload)
            if result.get("status") == "incomplete":
                raise ValueError(502, "조회문 생성이 완료되지 않았습니다. 질문 범위를 좁혀 주세요.")
            sql = "\n".join(part.get("text", "") for item in result.get("output", [])
                            for part in item.get("content", []) if part.get("type") == "output_text")
            return sql.strip().removeprefix("```sql").removesuffix("```").strip()
        
        system_prompt = """You are an expert SQL query generator. Convert natural language questions into valid SQL queries based on the provided database schema.

Rules:
1. Only use tables and columns that exist in the schema
2. Generate syntactically correct SQL
3. Return only the SQL query, no explanations
4. Use appropriate JOINs when needed
5. Handle aggregations, filtering, and sorting as requested"""

        user_prompt = f"""Database Schema:
{schema_info}

Question: {question}

Generate a SQL query to answer this question:"""

        try:
            options = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_completion_tokens": kwargs.get("max_tokens", 2048),
            }
            response = self.client.chat.completions.create(**options)
            
            sql_query = response.choices[0].message.content.strip()
            # Clean up the response (remove markdown formatting if present)
            if sql_query.startswith("```sql"):
                sql_query = sql_query[6:]
            if sql_query.endswith("```"):
                sql_query = sql_query[:-3]
            
            return sql_query.strip()
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def explain_query(self, sql_query: str, **kwargs) -> str:
        """Explain SQL query in natural language."""
        
        prompt = f"""Explain what this SQL query does in simple, clear language:

{sql_query}

Provide a concise explanation of:
1. What data is being retrieved
2. From which tables
3. Any filtering or grouping conditions
4. The expected result"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=kwargs.get("max_tokens", 1024)
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
