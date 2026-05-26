from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_report_service
from app.schemas.report import ChemicalReportRow, CustomerProfitReport, ProfitSummary
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/chemical-summary", response_model=list[ChemicalReportRow])
def chemical_summary(
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    service: ReportService = Depends(get_report_service),
) -> list[ChemicalReportRow]:
    """
    Per-chemical stock and profit for a date range.

    - purchased_qty / sold_qty / revenue / purchase_cost / profit: within the range
    - stock_qty: on-hand through date_to (all history if date_to omitted)
    """
    return service.chemical_summary(date_from=date_from, date_to=date_to)


@router.get("/profit-summary", response_model=ProfitSummary)
def profit_summary(
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    customer_id: Annotated[UUID | None, Query()] = None,
    service: ReportService = Depends(get_report_service),
) -> ProfitSummary:
    """Net profit for all sales or one customer in the date range (revenue − COGS − sale expenses)."""
    return service.profit_summary(
        date_from=date_from, date_to=date_to, customer_id=customer_id
    )


@router.get("/customer-profit/{customer_id}", response_model=CustomerProfitReport)
def customer_profit(
    customer_id: UUID,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    service: ReportService = Depends(get_report_service),
) -> CustomerProfitReport:
    """
    Profit for a customer: sale revenue minus purchase cost (avg rate per chemical)
    minus each sale's own expenses (food, auto, labour on the sale record).
    """
    return service.customer_profit(customer_id, date_from=date_from, date_to=date_to)
