# backend/app/categories/router.py
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.models import User
from app.categories import service
from app.categories.schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from app.core.database import get_db
from app.core.deps import get_current_user
from app.properties import service as property_service

router = APIRouter(
    prefix="/api/properties/{property_id}/categories",
    tags=["categories"],
)


def _get_property_or_403(property_id: uuid.UUID, db: Session, current_user: User):
    prop = property_service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=403, detail="Forbidden")
    return prop


@router.post("/", response_model=CategoryResponse, status_code=201)
def create_category(
    property_id: uuid.UUID,
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    return service.create_category(db, property_id, data)


@router.get("/", response_model=list[CategoryResponse])
def list_categories(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    return service.list_categories(db, property_id)


@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(
    property_id: uuid.UUID,
    cat_id: uuid.UUID,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    cat = service.get_category(db, cat_id, property_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return service.update_category(db, cat, data)


@router.delete("/{cat_id}", status_code=204)
def delete_category(
    property_id: uuid.UUID,
    cat_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    cat = service.get_category(db, cat_id, property_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    service.delete_category(db, cat)
