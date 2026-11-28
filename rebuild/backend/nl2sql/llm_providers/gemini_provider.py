"""Gemini provider added for ChocoDB's vendored nl2sql-py integration."""

import json
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .base import BaseLLMProvider


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-3.8-flash", **kwargs):
        super().__init__(api_key, **kwargs)
        self.model = model

    def list_models(self):
        """List text-capable generateContent models visible to this API key."""
        models = {}
        page_token = None
        for _ in range(10):
            params = {"pageSize": 1000}
            if page_token:
                params["pageToken"] = page_token
            request = Request(
                f"https://generativelanguage.googleapis.com/v1beta/models?{urlencode(params)}",
                headers={"x-goog-api-key": self.api_key},
            )
            try:
                with urlopen(request, timeout=30) as response:
                    result = json.load(response)
            except HTTPError as error:
                raise ValueError(f"Gemini 모델 목록을 가져오지 못했습니다 (HTTP {error.code}). API 키를 확인하세요.") from error
            except URLError as error:
                raise ValueError("Gemini 모델 목록 API에 연결할 수 없습니다.") from error
            for item in result.get("models", []):
                name = item.get("name", "")
                methods = item.get("supportedGenerationMethods", item.get("supportedActions", []))
                if (name.startswith("models/gemini-") and "generateContent" in methods
                        and not any(word in name for word in ("image", "audio", "tts", "live", "transcribe"))):
                    identifier = name.removeprefix("models/")
                    models[identifier] = {"id": identifier, "name": item.get("displayName") or identifier}
            page_token = result.get("nextPageToken")
            if not page_token:
                break
        return sorted(models.values(), key=lambda item: item["id"], reverse=True)

    def _generate(self, prompt: str, **kwargs) -> str:
        request = Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": kwargs.get("temperature", 0.1),
                    "maxOutputTokens": kwargs.get("max_tokens", 1024),
                },
            }).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
            method="POST",
        )
        try:
            with urlopen(request, timeout=90) as response:
                result = json.load(response)
        except HTTPError as error:
            raise ValueError(f"Gemini API 요청에 실패했습니다 (HTTP {error.code}). 키와 모델 접근 권한을 확인하세요.") from error
        except URLError as error:
            raise ValueError("Gemini API에 연결할 수 없습니다.") from error

        candidates = result.get("candidates") or []
        parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
        return "".join(part.get("text", "") for part in parts).strip()

    def generate_sql(self, question: str, schema_info: str, **kwargs) -> str:
        prompt = (
            "Generate one SQL query using only the tables and columns in this schema. "
            "Return SQL only, without Markdown or explanation.\n\n"
            f"Database schema:\n{schema_info}\n\nQuestion: {question}"
        )
        return self._generate(prompt, **kwargs)

    def explain_query(self, sql_query: str, **kwargs) -> str:
        return self._generate(f"Explain this SQL query concisely:\n{sql_query}", **kwargs)
