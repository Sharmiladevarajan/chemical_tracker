from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SaleItemIn(BaseModel):
    chemical_id: UUID
    quantity: Decimal = Field(gt=0)
    rate: Decimal = Field(gt=0)
    unit: Literal["liter", "kg", "cane"]
    can_size: Optional[Decimal] = None


class SaleCreate(BaseModel):
    customer_id: UUID
    occurred_at: Optional[datetime] = None
    paid: bool = False
    expense_food: Decimal = Field(default=Decimal("0"), ge=0)
    expense_auto: Decimal = Field(default=Decimal("0"), ge=0)
    expense_labour: Decimal = Field(default=Decimal("0"), ge=0)
    items: list[SaleItemIn] = Field(min_length=1)


class SaleUpdate(BaseModel):
    customer_id: UUID
    occurred_at: Optional[datetime] = None
    paid: bool = False
    expense_food: Decimal = Field(default=Decimal("0"), ge=0)
    expense_auto: Decimal = Field(default=Decimal("0"), ge=0)
    expense_labour: Decimal = Field(default=Decimal("0"), ge=0)
    items: list[SaleItemIn] = Field(min_length=1)


class SaleItemRead(BaseModel):
    id: UUID
    chemical_id: UUID
    quantity: Decimal
    rate: Decimal
    unit: str
    can_size: Optional[Decimal] = None
    subtotal: Decimal

    model_config = {"from_attributes": True}


class SaleRead(BaseModel):
    id: UUID
    occurred_at: datetime
    customer_id: UUID
    total: Decimal
    paid: bool
    expense_food: Decimal
    expense_auto: Decimal
    expense_labour: Decimal
    items: list[SaleItemRead]

    model_config = {"from_attributes": True}
