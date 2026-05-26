from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SaleExpenseSummary(BaseModel):
    sale_id: UUID
    occurred_at: datetime
    sale_total: Decimal
    expense_food: Decimal
    expense_auto: Decimal
    expense_labour: Decimal
    expense_total: Decimal


class CustomerProfitLine(BaseModel):
    sale_id: UUID
    occurred_at: datetime
    chemical_id: UUID
    chemical_name: str
    quantity: Decimal
    unit: str
    sale_rate: Decimal
    purchase_rate: Decimal
    revenue: Decimal
    cost: Decimal
    gross_profit: Decimal
    sale_expenses: Decimal
    net_profit: Decimal


class CustomerProfitReport(BaseModel):
    customer_id: UUID
    customer_name: str
    revenue: Decimal
    cost_of_goods: Decimal
    sale_expenses: Decimal
    profit: Decimal
    sales: list[SaleExpenseSummary]
    lines: list[CustomerProfitLine]


class ProfitSummary(BaseModel):
    revenue: Decimal
    cost_of_goods: Decimal
    sale_expenses: Decimal
    profit: Decimal


class ChemicalReportRow(BaseModel):
    chemical_id: UUID
    chemical_name: str
    unit: str
    purchased_qty: Decimal
    sold_qty: Decimal
    stock_qty: Decimal
    revenue: Decimal
    purchase_cost: Decimal
    profit: Decimal
