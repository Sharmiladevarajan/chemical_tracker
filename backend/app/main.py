import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from urllib.parse import urlparse

from app.api.router import api_router
from app.config import settings
from app.database.connection import normalize_database_url

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Chemical Business Tracker API",
    version="1.0.0",
    description="REST API backed by PostgreSQL (repositories + services).",
)

# Origins must match the browser exactly (no trailing slash). Override via CORS_ORIGINS on Render.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Return JSON 500 so CORS headers are applied (plain uvicorn 500 responses omit them)."""
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(api_router, prefix="/api")


@app.on_event("startup")
def _log_database_target() -> None:
    resolved = normalize_database_url(
        settings.database_url,
        settings.supabase_pooler_region,
        settings.supabase_pooler_host,
    )
    host = urlparse(resolved.replace("+psycopg2", "")).hostname
    logger.info("Database host: %s", host)

    if settings.supabase_pooler_region and host and "pooler.supabase.com" in host:
        if settings.supabase_pooler_region not in host:
            logger.warning(
                "SUPABASE_POOLER_REGION=%s does not match pooler host %s",
                settings.supabase_pooler_region,
                host,
            )

    if (
        settings.supabase_pooler_region is None
        and host
        and host.startswith("db.")
        and host.endswith(".supabase.co")
    ):
        logger.warning(
            "Direct Supabase host (IPv6). On Render set SUPABASE_POOLER_REGION=ap-southeast-1 "
            "or paste the Session pooler URI from the Supabase dashboard."
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
