from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Set in .env — do not commit real passwords. Special chars in password must be URL-encoded.
    database_url: str = Field(
        ...,
        description="e.g. postgresql+psycopg2://postgres:YOUR_PASSWORD@127.0.0.1:5432/chemical_tracker",
    )


settings = Settings()
