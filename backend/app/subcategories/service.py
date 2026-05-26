import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.categories.models import Category
from app.subcategories.models import Subcategory
from app.subcategories.schemas import SubcategoryCreate, SubcategoryUpdate


def create_subcategory(
    db: Session, property_id: uuid.UUID, data: SubcategoryCreate
) -> Subcategory:
    cat = db.get(Category, data.category_id)
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")
    sub = Subcategory(
        property_id=property_id,
        category_id=data.category_id,
        name=data.name,
        description=data.description,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def list_subcategories(db: Session, property_id: uuid.UUID) -> list[Subcategory]:
    return (
        db.query(Subcategory).filter(Subcategory.property_id == property_id).all()
    )


def get_subcategory(
    db: Session, sub_id: uuid.UUID, property_id: uuid.UUID
) -> Subcategory | None:
    return (
        db.query(Subcategory)
        .filter(Subcategory.id == sub_id, Subcategory.property_id == property_id)
        .first()
    )


def update_subcategory(
    db: Session, sub: Subcategory, data: SubcategoryUpdate
) -> Subcategory:
    for field in data.model_fields_set:
        setattr(sub, field, getattr(data, field))
    db.commit()
    db.refresh(sub)
    return sub


def delete_subcategory(db: Session, sub: Subcategory) -> None:
    db.delete(sub)
    db.commit()
