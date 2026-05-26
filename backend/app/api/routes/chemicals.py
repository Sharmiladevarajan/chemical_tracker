from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies import get_chemical_service
from app.schemas.chemical import ChemicalCreate, ChemicalRead
from app.services.chemical_service import ChemicalService

router = APIRouter(prefix="/chemicals", tags=["chemicals"])


@router.get("", response_model=list[ChemicalRead])
def list_chemicals(service: ChemicalService = Depends(get_chemical_service)) -> list[ChemicalRead]:
    return [ChemicalRead.model_validate(c) for c in service.list_chemicals()]


@router.post("", response_model=ChemicalRead, status_code=status.HTTP_201_CREATED)
def create_chemical(
    payload: ChemicalCreate,
    service: ChemicalService = Depends(get_chemical_service),
) -> ChemicalRead:
    entity = service.create(payload)
    return ChemicalRead.model_validate(entity)


@router.delete("/{chemical_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chemical(
    chemical_id: UUID,
    service: ChemicalService = Depends(get_chemical_service),
) -> None:
    service.delete(chemical_id)
