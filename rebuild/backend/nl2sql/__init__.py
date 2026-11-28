"""
NL2SQL: Natural Language to SQL Query Converter

A Python package that converts natural language questions into SQL queries
using various LLM providers and executes them on connected databases.
"""

from .llm_providers.openai_provider import OpenAIProvider
from .llm_providers.gemini_provider import GeminiProvider

__version__ = "0.1.0"
__author__ = "Mohamed Abdeltawab"

__all__ = [
    "OpenAIProvider",
    "GeminiProvider",
]
