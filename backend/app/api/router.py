from fastapi import APIRouter

from app.api.routes import chemicals, customers, ledger, purchases, reports, sales

api_router = APIRouter()
api_router.include_router(chemicals.router)
api_router.include_router(customers.router)
api_router.include_router(purchases.router)
api_router.include_router(sales.router)
api_router.include_router(ledger.router)
api_router.include_router(reports.router)
