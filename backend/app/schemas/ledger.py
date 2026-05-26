from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    occurred_at: datetime
    comment: str = ""


class LedgerRead(BaseModel):
    id: UUID
    customer_id: UUID
    entry_type: Literal["credit", "debit"]
    amount: Decimal
    occurred_at: datetime
    balance_after: Decimal
    comment: Optional[str] = None

    model_config = {"from_attributes": True}
