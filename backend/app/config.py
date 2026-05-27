from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_CORS = (
    "http://localhost:3000,"
    "http://127.0.0.1:3000,"
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://chemicaltracker.vercel.app"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Set in .env — do not commit real passwords. Special chars in password must be URL-encoded.
    database_url: str = Field(
        ...,
        description="e.g. postgresql+psycopg2://postgres:YOUR_PASSWORD@127.0.0.1:5432/chemical_tracker",
    )

    # Comma-separated browser origins (exact match, no trailing slash).
    cors_origins: str = Field(default=_DEFAULT_CORS, description="Comma-separated CORS allow_origins")

    # Optional regex for preview deploys (e.g. https://chemicaltracker-abc123.vercel.app)
    cors_origin_regex: str | None = Field(
        default=r"https://.*\.vercel\.app",
        description="Regex for extra allowed origins; set empty to disable",
    )

    # Required on Render when DATABASE_URL uses db.<ref>.supabase.co (e.g. ap-south-1)
    supabase_pooler_region: str | None = Field(
        default=None,
        description="Supabase pooler region; rewrites direct host to aws-0-<region>.pooler.supabase.com",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _strip_cors(cls, value: str) -> str:
        return value if isinstance(value, str) else _DEFAULT_CORS

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
