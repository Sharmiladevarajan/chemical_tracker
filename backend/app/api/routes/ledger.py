from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies import get_ledger_service
from app.schemas.ledger import LedgerRead, PaymentCreate
from app.services.ledger_service import LedgerService

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("", response_model=list[LedgerRead])
def list_all_ledger(service: LedgerService = Depends(get_ledger_service)) -> list[LedgerRead]:
    return [LedgerRead.model_validate(t) for t in service.list_all()]


@router.get("/customers/{customer_id}", response_model=list[LedgerRead])
def list_customer_ledger(
    customer_id: UUID,
    service: LedgerService = Depends(get_ledger_service),
) -> list[LedgerRead]:
    return [LedgerRead.model_validate(t) for t in service.list_for_customer(customer_id)]


@router.post(
    "/customers/{customer_id}/payments",
    response_model=LedgerRead,
    status_code=status.HTTP_201_CREATED,
)
def record_payment(
    customer_id: UUID,
    payload: PaymentCreate,
    service: LedgerService = Depends(get_ledger_service),
) -> LedgerRead:
    entity = service.record_payment(customer_id, payload)
    return LedgerRead.model_validate(entity)
