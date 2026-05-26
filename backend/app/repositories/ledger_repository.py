from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.entities import LedgerTransaction


class LedgerRepository:
    """Persistence access for `ledger_transactions`."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_all(self) -> list[LedgerTransaction]:
        stmt = select(LedgerTransaction).order_by(LedgerTransaction.occurred_at.desc())
        return list(self._session.scalars(stmt))

    def delete_all_for_customer(self, customer_id: UUID) -> None:
        self._session.execute(
            delete(LedgerTransaction).where(LedgerTransaction.customer_id == customer_id)
        )

    def list_for_customer(self, customer_id: UUID) -> list[LedgerTransaction]:
        stmt = (
            select(LedgerTransaction)
            .where(LedgerTransaction.customer_id == customer_id)
            .order_by(LedgerTransaction.occurred_at.desc())
        )
        return list(self._session.scalars(stmt))

    def add(self, entity: LedgerTransaction) -> LedgerTransaction:
        self._session.add(entity)
        self._session.flush()
        return entity
