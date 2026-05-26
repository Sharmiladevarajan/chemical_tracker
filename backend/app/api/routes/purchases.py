from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies import get_purchase_service
from app.schemas.purchase import PurchaseCreate, PurchaseRead, PurchaseUpdate
from app.services.purchase_service import PurchaseService

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("", response_model=list[PurchaseRead])
def list_purchases(service: PurchaseService = Depends(get_purchase_service)) -> list[PurchaseRead]:
    return [PurchaseRead.model_validate(p) for p in service.list_purchases()]


@router.get("/{purchase_id}", response_model=PurchaseRead)
def get_purchase(
    purchase_id: UUID,
    service: PurchaseService = Depends(get_purchase_service),
) -> PurchaseRead:
    return PurchaseRead.model_validate(service.get(purchase_id))


@router.post("", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
def create_purchase(
    payload: PurchaseCreate,
    service: PurchaseService = Depends(get_purchase_service),
) -> PurchaseRead:
    entity = service.create(payload)
    return PurchaseRead.model_validate(entity)


@router.put("/{purchase_id}", response_model=PurchaseRead)
def update_purchase(
    purchase_id: UUID,
    payload: PurchaseUpdate,
    service: PurchaseService = Depends(get_purchase_service),
) -> PurchaseRead:
    entity = service.update(purchase_id, payload)
    return PurchaseRead.model_validate(entity)


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: UUID,
    service: PurchaseService = Depends(get_purchase_service),
) -> None:
    service.delete(purchase_id)
