import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.database import get_db
from app.core.deps import get_current_user
from app.properties import service as property_service
from app.subcategories import service
from app.subcategories.schemas import SubcategoryCreate, SubcategoryResponse, SubcategoryUpdate

router = APIRouter(
    prefix="/api/properties/{property_id}/subcategories",
    tags=["subcategories"],
)


def _get_property_or_403(property_id: uuid.UUID, db: Session, current_user: User):
    prop = property_service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=403, detail="Forbidden")
    return prop


@router.post("/", response_model=SubcategoryResponse, status_code=201)
def create_subcategory(
    property_id: uuid.UUID,
    data: SubcategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    return service.create_subcategory(db, property_id, data)


@router.get("/", response_model=list[SubcategoryResponse])
def list_subcategories(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    return service.list_subcategories(db, property_id)


@router.put("/{sub_id}", response_model=SubcategoryResponse)
def update_subcategory(
    property_id: uuid.UUID,
    sub_id: uuid.UUID,
    data: SubcategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    sub = service.get_subcategory(db, sub_id, property_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    return service.update_subcategory(db, sub, data)


@router.delete("/{sub_id}", status_code=204)
def delete_subcategory(
    property_id: uuid.UUID,
    sub_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    sub = service.get_subcategory(db, sub_id, property_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    service.delete_subcategory(db, sub)
