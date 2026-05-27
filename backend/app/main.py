import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.config import settings

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
def _warn_supabase_pooler() -> None:
    url = settings.database_url
    if (
        settings.supabase_pooler_region is None
        and "@db." in url
        and "supabase.co" in url
    ):
        logger.warning(
            "DATABASE_URL uses direct Supabase host (IPv6). "
            "On Render, set SUPABASE_POOLER_REGION (e.g. ap-south-1) or use the Session pooler URI."
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
