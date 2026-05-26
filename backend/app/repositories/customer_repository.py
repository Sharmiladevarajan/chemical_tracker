from __future__ import annotations

from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Customer


class CustomerRepository:
    """Persistence access for `customers`."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_all(self) -> list[Customer]:
        return list(self._session.scalars(select(Customer).order_by(Customer.name)))

    def get_by_id(self, customer_id: UUID) -> Optional[Customer]:
        return self._session.get(Customer, customer_id)

    def add(self, entity: Customer) -> Customer:
        self._session.add(entity)
        self._session.flush()
        return entity

    def adjust_balance(self, customer: Customer, delta: Decimal) -> None:
        customer.balance = Decimal(customer.balance) + delta

    def delete(self, entity: Customer) -> None:
        self._session.delete(entity)
