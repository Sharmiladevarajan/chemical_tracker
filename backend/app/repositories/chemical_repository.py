from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Chemical


class ChemicalRepository:
    """Persistence access for `chemicals`."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_all(self) -> list[Chemical]:
        return list(self._session.scalars(select(Chemical).order_by(Chemical.name)))

    def get_by_id(self, chemical_id: UUID) -> Optional[Chemical]:
        return self._session.get(Chemical, chemical_id)

    def add(self, entity: Chemical) -> Chemical:
        self._session.add(entity)
        self._session.flush()
        return entity

    def delete(self, entity: Chemical) -> None:
        self._session.delete(entity)
