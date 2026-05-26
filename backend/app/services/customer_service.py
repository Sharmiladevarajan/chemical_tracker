from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import Customer
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.sale_repository import SaleRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerService:
    """Business operations for customers."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._repo = CustomerRepository(session)
        self._ledger = LedgerRepository(session)
        self._sales = SaleRepository(session)

    def list_customers(self) -> list[Customer]:
        return self._repo.list_all()

    def get(self, customer_id: UUID) -> Customer:
        entity = self._repo.get_by_id(customer_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return entity

    def update(self, customer_id: UUID, data: CustomerUpdate) -> Customer:
        entity = self._repo.get_by_id(customer_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        try:
            entity.name = data.name.strip()
            entity.contact = data.contact or None
            self._session.commit()
            self._session.refresh(entity)
            return entity
        except Exception:
            self._session.rollback()
            raise

    def create(self, data: CustomerCreate) -> Customer:
        entity = Customer(
            name=data.name.strip(),
            contact=data.contact or None,
            balance=Decimal("0"),
        )
        try:
            self._repo.add(entity)
            self._session.commit()
            return entity
        except Exception:
            self._session.rollback()
            raise

    def clear_ledger_history(self, customer_id: UUID) -> Customer:
        """Remove ledger rows, sales records, and reset balance; keep the customer."""
        entity = self._repo.get_by_id(customer_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        try:
            self._ledger.delete_all_for_customer(customer_id)
            for sale in self._sales.list_by_customer(customer_id):
                self._session.delete(sale)
            entity.balance = Decimal("0")
            self._session.commit()
            self._session.refresh(entity)
            return entity
        except Exception:
            self._session.rollback()
            raise

    def delete(self, customer_id: UUID) -> None:
        """Permanently remove customer and all related sales + ledger rows."""
        entity = self._repo.get_by_id(customer_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        try:
            self._ledger.delete_all_for_customer(customer_id)
            for sale in self._sales.list_by_customer(customer_id):
                self._session.delete(sale)
            self._repo.delete(entity)
            self._session.commit()
        except Exception:
            self._session.rollback()
            raise
