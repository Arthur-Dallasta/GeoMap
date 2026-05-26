import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.database import get_db
from app.core.deps import get_current_user
from app.properties import service
from app.properties.schemas import PropertyCreate, PropertyResponse, PropertyUpdate

router = APIRouter(prefix="/api/properties", tags=["properties"])


@router.get("/", response_model=list[PropertyResponse])
def list_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.list_properties(db, current_user.id)


@router.post("/", response_model=PropertyResponse, status_code=201)
def create_property(
    body: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.create_property(db, current_user.id, body.model_dump())


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada")
    return prop


@router.put("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: uuid.UUID,
    body: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada")
    return service.update_property(db, prop, body.model_dump())


@router.delete("/{property_id}", status_code=204)
def delete_property(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada")
    service.delete_property(db, prop)
