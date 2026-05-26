from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import Chemical
from app.repositories.chemical_repository import ChemicalRepository
from app.schemas.chemical import ChemicalCreate


class ChemicalService:
    """Business operations for chemicals."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._repo = ChemicalRepository(session)

    def list_chemicals(self) -> list[Chemical]:
        return self._repo.list_all()

    def create(self, data: ChemicalCreate) -> Chemical:
        entity = Chemical(
            name=data.name.strip(),
            unit=data.unit,
            default_can_size=data.default_can_size,
        )
        try:
            self._repo.add(entity)
            self._session.commit()
            return entity
        except Exception:
            self._session.rollback()
            raise

    def delete(self, chemical_id: UUID) -> None:
        entity = self._repo.get_by_id(chemical_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chemical not found")
        try:
            self._repo.delete(entity)
            self._session.commit()
        except Exception:
            self._session.rollback()
            raise
