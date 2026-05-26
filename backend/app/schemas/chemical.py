from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ChemicalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    unit: Literal["liter", "kg", "cane"]
    default_can_size: Optional[Decimal] = None


class ChemicalRead(BaseModel):
    id: UUID
    name: str
    unit: str
    default_can_size: Optional[Decimal] = None

    model_config = {"from_attributes": True}
