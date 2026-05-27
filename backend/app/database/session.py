from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.database.connection import build_connect_args, normalize_database_url

_engine = None
SessionLocal = None


def get_engine():
    global _engine, SessionLocal
    if _engine is None:
        url = normalize_database_url(
            settings.database_url,
            settings.supabase_pooler_region,
        )

        _engine = create_engine(
            url,
            pool_pre_ping=True,
            connect_args=build_connect_args(url),
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def get_db() -> Generator[Session, None, None]:
    get_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
