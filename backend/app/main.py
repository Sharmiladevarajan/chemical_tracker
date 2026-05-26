from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router

app = FastAPI(
    title="Chemical Business Tracker API",
    version="1.0.0",
    description="REST API backed by PostgreSQL (repositories + services).",
)

# Origins must match the browser exactly (no trailing slash). Include 127.0.0.1 and
# localhost so Vite + API URL combinations work. credentials=False avoids wildcard issues.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
