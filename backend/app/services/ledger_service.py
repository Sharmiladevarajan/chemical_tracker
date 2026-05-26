from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import LedgerTransaction
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.schemas.ledger import PaymentCreate


class LedgerService:
    """Customer ledger: payments (credit) and history."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._customers = CustomerRepository(session)
        self._ledger = LedgerRepository(session)

    def list_all(self) -> list[LedgerTransaction]:
        return self._ledger.list_all()

    def list_for_customer(self, customer_id: UUID) -> list[LedgerTransaction]:
        customer = self._customers.get_by_id(customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return self._ledger.list_for_customer(customer_id)

    def record_payment(self, customer_id: UUID, data: PaymentCreate) -> LedgerTransaction:
        customer = self._customers.get_by_id(customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

        amount = data.amount.quantize(Decimal("0.01"))
        new_balance = Decimal(customer.balance) - amount

        entry = LedgerTransaction(
            customer_id=customer_id,
            entry_type="credit",
            amount=amount,
            occurred_at=data.occurred_at,
            balance_after=new_balance,
            comment=data.comment or None,
        )

        try:
            self._customers.adjust_balance(customer, -amount)
            saved = self._ledger.add(entry)
            self._session.commit()
            return saved
        except Exception:
            self._session.rollback()
            raise
