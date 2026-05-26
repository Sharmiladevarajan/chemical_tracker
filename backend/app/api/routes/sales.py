from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies import get_sale_service
from app.schemas.sale import SaleCreate, SaleRead, SaleUpdate
from app.services.sale_service import SaleService

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=list[SaleRead])
def list_sales(service: SaleService = Depends(get_sale_service)) -> list[SaleRead]:
    return [SaleRead.model_validate(s) for s in service.list_sales()]


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(
    sale_id: UUID,
    service: SaleService = Depends(get_sale_service),
) -> SaleRead:
    return SaleRead.model_validate(service.get(sale_id))


@router.post("", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    service: SaleService = Depends(get_sale_service),
) -> SaleRead:
    entity = service.create(payload)
    return SaleRead.model_validate(entity)


@router.put("/{sale_id}", response_model=SaleRead)
def update_sale(
    sale_id: UUID,
    payload: SaleUpdate,
    service: SaleService = Depends(get_sale_service),
) -> SaleRead:
    entity = service.update(sale_id, payload)
    return SaleRead.model_validate(entity)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: UUID,
    service: SaleService = Depends(get_sale_service),
) -> None:
    service.delete(sale_id)
