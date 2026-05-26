from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import Purchase, PurchaseItem
from app.repositories.chemical_repository import ChemicalRepository
from app.repositories.purchase_repository import PurchaseRepository
from app.schemas.purchase import PurchaseCreate, PurchaseItemIn, PurchaseUpdate


class PurchaseService:
    """Business operations for purchase orders."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._purchases = PurchaseRepository(session)
        self._chemicals = ChemicalRepository(session)

    def list_purchases(self) -> list[Purchase]:
        return self._purchases.list_all()

    def get(self, purchase_id: UUID) -> Purchase:
        purchase = self._purchases.get_by_id(purchase_id)
        if purchase is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
        return purchase

    def _build_lines(self, items: list[PurchaseItemIn]) -> tuple[Decimal, list[PurchaseItem]]:
        items_total = Decimal("0")
        line_entities: list[PurchaseItem] = []
        for line in items:
            if self._chemicals.get_by_id(line.chemical_id) is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Chemical {line.chemical_id} not found",
                )
            subtotal = (line.amount * line.rate).quantize(Decimal("0.01"))
            items_total += subtotal
            line_entities.append(
                PurchaseItem(
                    chemical_id=line.chemical_id,
                    amount=line.amount,
                    rate=line.rate,
                    unit=line.unit,
                    can_size=line.can_size,
                    subtotal=subtotal,
                )
            )
        return items_total, line_entities

    def delete(self, purchase_id: UUID) -> None:
        purchase = self._purchases.get_by_id(purchase_id)
        if purchase is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
        try:
            self._session.delete(purchase)
            self._session.commit()
        except Exception:
            self._session.rollback()
            raise

    def create(self, data: PurchaseCreate) -> Purchase:
        occurred_at = data.occurred_at or datetime.now(timezone.utc)
        items_total, line_entities = self._build_lines(data.items)
        expenses = data.expense_food + data.expense_auto + data.expense_labour
        total_cost = items_total + expenses

        purchase = Purchase(
            occurred_at=occurred_at,
            expense_food=data.expense_food,
            expense_auto=data.expense_auto,
            expense_labour=data.expense_labour,
            total_cost=total_cost,
        )
        purchase.items = line_entities

        try:
            self._purchases.add(purchase)
            self._session.commit()
        except Exception:
            self._session.rollback()
            raise

        result = self._purchases.get_by_id(purchase.id)
        assert result is not None
        return result

    def update(self, purchase_id: UUID, data: PurchaseUpdate) -> Purchase:
        purchase = self.get(purchase_id)
        occurred_at = data.occurred_at or purchase.occurred_at
        items_total, line_entities = self._build_lines(data.items)
        expenses = data.expense_food + data.expense_auto + data.expense_labour
        total_cost = items_total + expenses

        try:
            for item in list(purchase.items):
                self._session.delete(item)

            purchase.occurred_at = occurred_at
            purchase.expense_food = data.expense_food
            purchase.expense_auto = data.expense_auto
            purchase.expense_labour = data.expense_labour
            purchase.total_cost = total_cost
            purchase.items = line_entities

            self._session.commit()
        except Exception:
            self._session.rollback()
            raise

        result = self._purchases.get_by_id(purchase_id)
        assert result is not None
        return result
