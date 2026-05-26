from fastapi import Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.chemical_service import ChemicalService
from app.services.customer_service import CustomerService
from app.services.ledger_service import LedgerService
from app.services.purchase_service import PurchaseService
from app.services.report_service import ReportService
from app.services.sale_service import SaleService


def get_chemical_service(db: Session = Depends(get_db)) -> ChemicalService:
    return ChemicalService(db)


def get_customer_service(db: Session = Depends(get_db)) -> CustomerService:
    return CustomerService(db)


def get_purchase_service(db: Session = Depends(get_db)) -> PurchaseService:
    return PurchaseService(db)


def get_sale_service(db: Session = Depends(get_db)) -> SaleService:
    return SaleService(db)


def get_ledger_service(db: Session = Depends(get_db)) -> LedgerService:
    return LedgerService(db)


def get_report_service(db: Session = Depends(get_db)) -> ReportService:
    return ReportService(db)
