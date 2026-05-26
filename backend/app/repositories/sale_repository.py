from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import Sale


class SaleRepository:
    """Persistence access for `sales` and `sale_items`."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_by_customer(self, customer_id: UUID) -> list[Sale]:
        stmt = select(Sale).where(Sale.customer_id == customer_id)
        return list(self._session.scalars(stmt))

    def list_all(self) -> list[Sale]:
        stmt = (
            select(Sale)
            .options(selectinload(Sale.items))
            .order_by(Sale.occurred_at.desc())
        )
        return list(self._session.scalars(stmt))

    def get_by_id(self, sale_id: UUID) -> Sale | None:
        stmt = select(Sale).options(selectinload(Sale.items)).where(Sale.id == sale_id)
        return self._session.scalars(stmt).first()

    def add(self, entity: Sale) -> Sale:
        self._session.add(entity)
        self._session.flush()
        return entity
