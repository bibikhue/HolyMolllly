from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseLLMProvider(ABC):
    """Base class for all LLM providers."""
    
    def __init__(self, api_key: str, **kwargs):
        self.api_key = api_key
        self.config = kwargs
    
    @abstractmethod
    def generate_sql(self, question: str, schema_info: str, **kwargs) -> str:
        """
        Generate SQL query from natural language question.
        
        Args:
            question: Natural language question
            schema_info: Database schema information
            **kwargs: Additional parameters
            
        Returns:
            Generated SQL query
        """
        pass
    
    @abstractmethod
    def explain_query(self, sql_query: str, **kwargs) -> str:
        """
        Explain what a SQL query does in natural language.
        
        Args:
            sql_query: SQL query to explain
            **kwargs: Additional parameters
            
        Returns:
            Natural language explanation
        """
        pass
