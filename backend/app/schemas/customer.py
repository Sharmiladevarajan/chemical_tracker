from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    contact: str = Field(default="", max_length=300)


class CustomerUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    contact: str = Field(default="", max_length=300)


class CustomerRead(BaseModel):
    id: UUID
    name: str
    contact: str | None
    balance: Decimal

    model_config = {"from_attributes": True}
