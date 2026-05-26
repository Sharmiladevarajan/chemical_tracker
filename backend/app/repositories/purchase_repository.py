from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import Purchase


class PurchaseRepository:
    """Persistence access for `purchases` and `purchase_items`."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_all(self) -> list[Purchase]:
        stmt = (
            select(Purchase)
            .options(selectinload(Purchase.items))
            .order_by(Purchase.occurred_at.desc())
        )
        return list(self._session.scalars(stmt))

    def get_by_id(self, purchase_id: UUID) -> Purchase | None:
        stmt = select(Purchase).options(selectinload(Purchase.items)).where(Purchase.id == purchase_id)
        return self._session.scalars(stmt).first()

    def add(self, entity: Purchase) -> Purchase:
        self._session.add(entity)
        self._session.flush()
        return entity
