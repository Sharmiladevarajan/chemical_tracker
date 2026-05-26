from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

_engine = None
SessionLocal = None


def get_engine():
    global _engine, SessionLocal
    if _engine is None:
        _engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
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
