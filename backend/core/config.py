"""Database settings read from the repository's database/.env file."""

from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


DATABASE_ENV_PATH = Path(__file__).resolve().parents[2] / "database" / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=DATABASE_ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    DB_PORT: int | None = None
    MYSQL_USER: str | None = None
    MYSQL_DATABASE: str | None = None
    MYSQL_PASSWORD: SecretStr | None = None
    HOST: str = "localhost"

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        def db_environment():
            # HOST is generic: only database/.env (or an explicit constructor
            # value) may override the localhost default.
            return {
                key: value
                for key, value in env_settings().items()
                if key.upper() != "HOST"
            }

        # A DB-specific file wins over process variables for shared DB names.
        return init_settings, dotenv_settings, db_environment, file_secret_settings
