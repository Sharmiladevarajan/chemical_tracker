from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PurchaseItemIn(BaseModel):
    chemical_id: UUID
    amount: Decimal = Field(gt=0)
    rate: Decimal = Field(gt=0)
    unit: Literal["liter", "kg", "cane"]
    can_size: Optional[Decimal] = None


class PurchaseCreate(BaseModel):
    occurred_at: Optional[datetime] = None
    expense_food: Decimal = Decimal("0")
    expense_auto: Decimal = Decimal("0")
    expense_labour: Decimal = Decimal("0")
    items: list[PurchaseItemIn] = Field(min_length=1)


class PurchaseUpdate(BaseModel):
    occurred_at: Optional[datetime] = None
    expense_food: Decimal = Decimal("0")
    expense_auto: Decimal = Decimal("0")
    expense_labour: Decimal = Decimal("0")
    items: list[PurchaseItemIn] = Field(min_length=1)


class PurchaseItemRead(BaseModel):
    id: UUID
    chemical_id: UUID
    amount: Decimal
    rate: Decimal
    unit: str
    can_size: Optional[Decimal] = None
    subtotal: Decimal

    model_config = {"from_attributes": True}


class PurchaseRead(BaseModel):
    id: UUID
    occurred_at: datetime
    expense_food: Decimal
    expense_auto: Decimal
    expense_labour: Decimal
    total_cost: Decimal
    items: list[PurchaseItemRead]

    model_config = {"from_attributes": True}
