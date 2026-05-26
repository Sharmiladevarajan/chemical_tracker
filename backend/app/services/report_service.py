from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import Chemical, Customer, Purchase, PurchaseItem, Sale, SaleItem
from app.schemas.report import (
    ChemicalReportRow,
    CustomerProfitLine,
    CustomerProfitReport,
    ProfitSummary,
    SaleExpenseSummary,
)


def _effective_purchase_qty():
    return case(
        (
            PurchaseItem.unit == "cane",
            PurchaseItem.amount
            * func.coalesce(PurchaseItem.can_size, Chemical.default_can_size, 45),
        ),
        else_=PurchaseItem.amount,
    )


def _effective_sale_qty():
    return case(
        (
            SaleItem.unit == "cane",
            SaleItem.quantity * func.coalesce(SaleItem.can_size, Chemical.default_can_size, 45),
        ),
        else_=SaleItem.quantity,
    )


def _qty_from_parts(qty: Decimal, unit: str, can_size: Decimal | None, default_can: Decimal | None) -> Decimal:
    if unit == "cane":
        return qty * (can_size or default_can or Decimal("45"))
    return qty


class ReportService:
    """Stock and per-chemical profit from purchase/sale line items."""

    def __init__(self, session: Session) -> None:
        self._session = session

    @staticmethod
    def _start_of_day(d: date) -> datetime:
        return datetime.combine(d, time.min)

    @staticmethod
    def _end_of_day(d: date) -> datetime:
        return datetime.combine(d, time(23, 59, 59, 999999))

    @staticmethod
    def _apply_range(stmt, column, start: datetime | None, end: datetime | None):
        if start is not None:
            stmt = stmt.where(column >= start)
        if end is not None:
            stmt = stmt.where(column <= end)
        return stmt

    def chemical_summary(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[ChemicalReportRow]:
        chemicals = list(self._session.scalars(select(Chemical).order_by(Chemical.name)))

        period_start = self._start_of_day(date_from) if date_from else None
        period_end = self._end_of_day(date_to) if date_to else None

        purchased_qty = self._sum_purchase_qty(period_start, period_end)
        sold_qty = self._sum_sale_qty(period_start, period_end)
        stock_qty = self._stock_qty(None, period_end)
        purchase_cost = self._sum_purchase_cost(period_start, period_end)
        revenue = self._sum_sale_revenue(period_start, period_end)

        rows: list[ChemicalReportRow] = []
        for chem in chemicals:
            cid = chem.id
            rev = revenue.get(cid, Decimal("0"))
            cost = purchase_cost.get(cid, Decimal("0"))
            rows.append(
                ChemicalReportRow(
                    chemical_id=cid,
                    chemical_name=chem.name,
                    unit=chem.unit,
                    purchased_qty=purchased_qty.get(cid, Decimal("0")),
                    sold_qty=sold_qty.get(cid, Decimal("0")),
                    stock_qty=stock_qty.get(cid, Decimal("0")),
                    revenue=rev,
                    purchase_cost=cost,
                    profit=rev - cost,
                )
            )
        return rows

    def _sum_purchase_qty(
        self, start: datetime | None, end: datetime | None
    ) -> dict[UUID, Decimal]:
        stmt = (
            select(
                PurchaseItem.chemical_id,
                func.coalesce(func.sum(_effective_purchase_qty()), 0),
            )
            .join(Purchase, Purchase.id == PurchaseItem.purchase_id)
            .join(Chemical, Chemical.id == PurchaseItem.chemical_id)
        )
        stmt = self._apply_range(stmt, Purchase.occurred_at, start, end)
        stmt = stmt.group_by(PurchaseItem.chemical_id)
        return {row[0]: Decimal(str(row[1])) for row in self._session.execute(stmt)}

    def _sum_sale_qty(self, start: datetime | None, end: datetime | None) -> dict[UUID, Decimal]:
        stmt = (
            select(
                SaleItem.chemical_id,
                func.coalesce(func.sum(_effective_sale_qty()), 0),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .join(Chemical, Chemical.id == SaleItem.chemical_id)
        )
        stmt = self._apply_range(stmt, Sale.occurred_at, start, end)
        stmt = stmt.group_by(SaleItem.chemical_id)
        return {row[0]: Decimal(str(row[1])) for row in self._session.execute(stmt)}

    def _sum_purchase_cost(
        self, start: datetime | None, end: datetime | None
    ) -> dict[UUID, Decimal]:
        stmt = (
            select(
                PurchaseItem.chemical_id,
                func.coalesce(func.sum(PurchaseItem.subtotal), 0),
            )
            .join(Purchase, Purchase.id == PurchaseItem.purchase_id)
        )
        stmt = self._apply_range(stmt, Purchase.occurred_at, start, end)
        stmt = stmt.group_by(PurchaseItem.chemical_id)
        return {row[0]: Decimal(str(row[1])) for row in self._session.execute(stmt)}

    def _sum_sale_revenue(
        self, start: datetime | None, end: datetime | None
    ) -> dict[UUID, Decimal]:
        stmt = (
            select(
                SaleItem.chemical_id,
                func.coalesce(func.sum(SaleItem.subtotal), 0),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
        )
        stmt = self._apply_range(stmt, Sale.occurred_at, start, end)
        stmt = stmt.group_by(SaleItem.chemical_id)
        return {row[0]: Decimal(str(row[1])) for row in self._session.execute(stmt)}

    def _stock_qty(
        self, start: datetime | None, end: datetime | None
    ) -> dict[UUID, Decimal]:
        purchased = self._sum_purchase_qty(start, end)
        sold = self._sum_sale_qty(start, end)
        ids = set(purchased) | set(sold)
        return {cid: purchased.get(cid, Decimal("0")) - sold.get(cid, Decimal("0")) for cid in ids}

    def _weighted_avg_purchase_rates(
        self, start: datetime | None, end: datetime | None
    ) -> dict[UUID, Decimal]:
        stmt = (
            select(
                PurchaseItem.chemical_id,
                func.coalesce(func.sum(PurchaseItem.subtotal), 0),
                func.coalesce(func.sum(_effective_purchase_qty()), 0),
            )
            .join(Purchase, Purchase.id == PurchaseItem.purchase_id)
            .join(Chemical, Chemical.id == PurchaseItem.chemical_id)
        )
        stmt = self._apply_range(stmt, Purchase.occurred_at, start, end)
        stmt = stmt.group_by(PurchaseItem.chemical_id)
        rates: dict[UUID, Decimal] = {}
        for cid, subtotal, qty in self._session.execute(stmt):
            qty_d = Decimal(str(qty))
            if qty_d > 0:
                rates[cid] = (Decimal(str(subtotal)) / qty_d).quantize(Decimal("0.0001"))
        return rates

    def _profit_totals_for_sales(
        self,
        sales: list[Sale],
        chemicals: dict[UUID, Chemical],
        avg_rates: dict[UUID, Decimal],
        *,
        build_lines: bool = False,
    ) -> tuple[Decimal, Decimal, Decimal, list[CustomerProfitLine], list[SaleExpenseSummary]]:
        lines: list[CustomerProfitLine] = []
        sale_summaries: list[SaleExpenseSummary] = []
        revenue = Decimal("0")
        cogs = Decimal("0")
        sale_expenses_total = Decimal("0")

        for sale in sales:
            food = Decimal(sale.expense_food)
            auto = Decimal(sale.expense_auto)
            labour = Decimal(sale.expense_labour)
            sale_exp = food + auto + labour
            sale_expenses_total += sale_exp
            sale_total = Decimal(sale.total)
            sale_summaries.append(
                SaleExpenseSummary(
                    sale_id=sale.id,
                    occurred_at=sale.occurred_at,
                    sale_total=sale_total,
                    expense_food=food,
                    expense_auto=auto,
                    expense_labour=labour,
                    expense_total=sale_exp,
                )
            )

            for item in sale.items:
                chem = chemicals.get(item.chemical_id)
                qty = _qty_from_parts(
                    Decimal(item.quantity),
                    item.unit,
                    Decimal(item.can_size) if item.can_size is not None else None,
                    Decimal(chem.default_can_size) if chem and chem.default_can_size else None,
                )
                purchase_rate = avg_rates.get(item.chemical_id, Decimal("0"))
                rev = Decimal(item.subtotal)
                cost = (qty * purchase_rate).quantize(Decimal("0.01"))
                gross = rev - cost
                expense_share = (
                    (rev / sale_total * sale_exp).quantize(Decimal("0.01"))
                    if sale_total > 0
                    else Decimal("0")
                )
                net = gross - expense_share
                revenue += rev
                cogs += cost
                if build_lines:
                    lines.append(
                        CustomerProfitLine(
                            sale_id=sale.id,
                            occurred_at=sale.occurred_at,
                            chemical_id=item.chemical_id,
                            chemical_name=chem.name if chem else "Unknown",
                            quantity=Decimal(item.quantity),
                            unit=item.unit,
                            sale_rate=Decimal(item.rate),
                            purchase_rate=purchase_rate,
                            revenue=rev,
                            cost=cost,
                            gross_profit=gross,
                            sale_expenses=expense_share,
                            net_profit=net,
                        )
                    )

        return revenue, cogs, sale_expenses_total, lines, sale_summaries

    def profit_summary(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
        customer_id: UUID | None = None,
    ) -> ProfitSummary:
        period_start = self._start_of_day(date_from) if date_from else None
        period_end = self._end_of_day(date_to) if date_to else None

        chemicals = {c.id: c for c in self._session.scalars(select(Chemical)).all()}
        avg_rates = self._weighted_avg_purchase_rates(None, period_end)

        stmt = select(Sale).options(selectinload(Sale.items)).order_by(Sale.occurred_at.desc())
        if customer_id is not None:
            stmt = stmt.where(Sale.customer_id == customer_id)
        stmt = self._apply_range(stmt, Sale.occurred_at, period_start, period_end)
        sales = list(self._session.scalars(stmt))

        revenue, cogs, sale_expenses, _, _ = self._profit_totals_for_sales(
            sales, chemicals, avg_rates, build_lines=False
        )
        return ProfitSummary(
            revenue=revenue,
            cost_of_goods=cogs,
            sale_expenses=sale_expenses,
            profit=revenue - cogs - sale_expenses,
        )

    def customer_profit(
        self,
        customer_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> CustomerProfitReport:
        customer = self._session.get(Customer, customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

        period_start = self._start_of_day(date_from) if date_from else None
        period_end = self._end_of_day(date_to) if date_to else None

        chemicals = {
            c.id: c for c in self._session.scalars(select(Chemical)).all()
        }
        avg_rates = self._weighted_avg_purchase_rates(None, period_end)

        stmt = (
            select(Sale)
            .options(selectinload(Sale.items))
            .where(Sale.customer_id == customer_id)
            .order_by(Sale.occurred_at.desc())
        )
        stmt = self._apply_range(stmt, Sale.occurred_at, period_start, period_end)
        sales = list(self._session.scalars(stmt))

        revenue, cogs, sale_expenses_total, lines, sale_summaries = self._profit_totals_for_sales(
            sales, chemicals, avg_rates, build_lines=True
        )
        profit = revenue - cogs - sale_expenses_total

        return CustomerProfitReport(
            customer_id=customer.id,
            customer_name=customer.name,
            revenue=revenue,
            cost_of_goods=cogs,
            sale_expenses=sale_expenses_total,
            profit=profit,
            sales=sale_summaries,
            lines=lines,
        )
