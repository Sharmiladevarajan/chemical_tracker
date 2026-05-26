from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies import get_customer_service
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerRead])
def list_customers(service: CustomerService = Depends(get_customer_service)) -> list[CustomerRead]:
    return [CustomerRead.model_validate(c) for c in service.list_customers()]


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: UUID,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerRead:
    return CustomerRead.model_validate(service.get(customer_id))


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerRead:
    entity = service.create(payload)
    return CustomerRead.model_validate(entity)


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerRead:
    entity = service.update(customer_id, payload)
    return CustomerRead.model_validate(entity)


@router.delete("/{customer_id}/ledger", status_code=status.HTTP_204_NO_CONTENT)
def clear_customer_ledger(
    customer_id: UUID,
    service: CustomerService = Depends(get_customer_service),
) -> None:
    """Clear transaction history and reset balance; customer row is kept."""
    service.clear_ledger_history(customer_id)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: UUID,
    service: CustomerService = Depends(get_customer_service),
) -> None:
    """Permanently delete the customer and all related data."""
    service.delete(customer_id)
