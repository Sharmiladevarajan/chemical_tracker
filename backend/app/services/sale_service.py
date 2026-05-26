from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import LedgerTransaction, Sale, SaleItem
from app.repositories.chemical_repository import ChemicalRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.sale_repository import SaleRepository
from app.schemas.sale import SaleCreate, SaleItemIn, SaleUpdate


class SaleService:
    """Business operations for sales (inventory out / customer billing)."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._sales = SaleRepository(session)
        self._customers = CustomerRepository(session)
        self._chemicals = ChemicalRepository(session)
        self._ledger = LedgerRepository(session)

    def list_sales(self) -> list[Sale]:
        return self._sales.list_all()

    def get(self, sale_id: UUID) -> Sale:
        sale = self._sales.get_by_id(sale_id)
        if sale is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
        return sale

    def _build_lines(self, items: list[SaleItemIn]) -> tuple[Decimal, list[SaleItem]]:
        grand = Decimal("0")
        lines: list[SaleItem] = []
        for line in items:
            if self._chemicals.get_by_id(line.chemical_id) is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Chemical {line.chemical_id} not found",
                )
            subtotal = (line.quantity * line.rate).quantize(Decimal("0.01"))
            grand += subtotal
            lines.append(
                SaleItem(
                    chemical_id=line.chemical_id,
                    quantity=line.quantity,
                    rate=line.rate,
                    unit=line.unit,
                    can_size=line.can_size,
                    subtotal=subtotal,
                )
            )
        return grand, lines

    def _remove_matching_debit(self, customer_id: UUID, amount: Decimal) -> None:
        for entry in self._ledger.list_for_customer(customer_id):
            if entry.entry_type == "debit" and entry.amount == amount:
                self._session.delete(entry)
                return

    def _revert_unpaid_sale(self, sale: Sale) -> None:
        if sale.paid:
            return
        customer = self._customers.get_by_id(sale.customer_id)
        if customer is None:
            return
        self._customers.adjust_balance(customer, -sale.total)
        self._remove_matching_debit(sale.customer_id, sale.total)

    def _apply_unpaid_sale(
        self, customer_id: UUID, amount: Decimal, occurred_at: datetime
    ) -> None:
        customer = self._customers.get_by_id(customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        new_balance = Decimal(customer.balance) + amount
        self._customers.adjust_balance(customer, amount)
        self._ledger.add(
            LedgerTransaction(
                customer_id=customer_id,
                entry_type="debit",
                amount=amount,
                occurred_at=occurred_at,
                balance_after=new_balance,
                comment=None,
            )
        )

    def delete(self, sale_id: UUID) -> None:
        sale = self._sales.get_by_id(sale_id)
        if sale is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
        try:
            self._revert_unpaid_sale(sale)
            self._session.delete(sale)
            self._session.commit()
        except Exception:
            self._session.rollback()
            raise

    def create(self, data: SaleCreate) -> Sale:
        if self._customers.get_by_id(data.customer_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

        occurred_at = data.occurred_at or datetime.now(timezone.utc)
        grand, lines = self._build_lines(data.items)

        sale = Sale(
            occurred_at=occurred_at,
            customer_id=data.customer_id,
            total=grand,
            paid=data.paid,
            expense_food=data.expense_food,
            expense_auto=data.expense_auto,
            expense_labour=data.expense_labour,
        )
        sale.items = lines

        try:
            self._sales.add(sale)
            if not data.paid:
                self._apply_unpaid_sale(data.customer_id, grand, occurred_at)
            self._session.commit()
        except Exception:
            self._session.rollback()
            raise

        result = self._sales.get_by_id(sale.id)
        assert result is not None
        return result

    def update(self, sale_id: UUID, data: SaleUpdate) -> Sale:
        sale = self.get(sale_id)
        if self._customers.get_by_id(data.customer_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

        occurred_at = data.occurred_at or sale.occurred_at
        grand, lines = self._build_lines(data.items)

        try:
            self._revert_unpaid_sale(sale)
            for item in list(sale.items):
                self._session.delete(item)

            sale.customer_id = data.customer_id
            sale.paid = data.paid
            sale.total = grand
            sale.occurred_at = occurred_at
            sale.expense_food = data.expense_food
            sale.expense_auto = data.expense_auto
            sale.expense_labour = data.expense_labour
            sale.items = lines

            if not data.paid:
                self._apply_unpaid_sale(data.customer_id, grand, occurred_at)

            self._session.commit()
        except Exception:
            self._session.rollback()
            raise

        result = self._sales.get_by_id(sale_id)
        assert result is not None
        return result
