from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import settings

app = FastAPI(
    title="Chemical Business Tracker API",
    version="1.0.0",
    description="REST API backed by PostgreSQL (repositories + services).",
)

# Origins must match the browser exactly (no trailing slash). Override via CORS_ORIGINS on Render.
_cors_kw: dict = {
    "allow_origins": settings.cors_origins_list,
    "allow_credentials": False,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.cors_origin_regex:
    _cors_kw["allow_origin_regex"] = settings.cors_origin_regex

app.add_middleware(CORSMiddleware, **_cors_kw)

app.include_router(api_router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
