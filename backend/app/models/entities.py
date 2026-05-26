import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


chemical_unit_enum = ENUM("liter", "kg", "cane", name="chemical_unit", create_type=False)
ledger_type_enum = ENUM("credit", "debit", name="ledger_type", create_type=False)


class Chemical(Base):
    __tablename__ = "chemicals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    unit: Mapped[str] = mapped_column(chemical_unit_enum, nullable=False)
    default_can_size: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact: Mapped[Optional[str]] = mapped_column(String(300))
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sales: Mapped[list["Sale"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    ledger_entries: Mapped[list["LedgerTransaction"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expense_food: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    expense_auto: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    expense_labour: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    total_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    items: Mapped[list["PurchaseItem"]] = relationship(
        back_populates="purchase", cascade="all, delete-orphan"
    )


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("purchases.id"), nullable=False)
    chemical_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chemicals.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit: Mapped[str] = mapped_column(chemical_unit_enum, nullable=False)
    can_size: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    purchase: Mapped["Purchase"] = relationship(back_populates="items")


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expense_food: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    expense_auto: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    expense_labour: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))

    customer: Mapped["Customer"] = relationship(back_populates="sales")
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id"), nullable=False)
    chemical_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chemicals.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit: Mapped[str] = mapped_column(chemical_unit_enum, nullable=False)
    can_size: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    sale: Mapped["Sale"] = relationship(back_populates="items")


class LedgerTransaction(Base):
    __tablename__ = "ledger_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=False)
    entry_type: Mapped[str] = mapped_column("type", ledger_type_enum, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text)

    customer: Mapped["Customer"] = relationship(back_populates="ledger_entries")
