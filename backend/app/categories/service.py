# backend/app/categories/service.py
import uuid

from sqlalchemy.orm import Session

from app.categories.models import Category
from app.categories.schemas import CategoryCreate, CategoryUpdate


def create_category(
    db: Session, property_id: uuid.UUID, data: CategoryCreate
) -> Category:
    cat = Category(
        property_id=property_id,
        name=data.name,
        color=data.color,
        description=data.description,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def list_categories(db: Session, property_id: uuid.UUID) -> list[Category]:
    return db.query(Category).filter(Category.property_id == property_id).all()


def get_category(
    db: Session, cat_id: uuid.UUID, property_id: uuid.UUID
) -> Category | None:
    return (
        db.query(Category)
        .filter(Category.id == cat_id, Category.property_id == property_id)
        .first()
    )


def update_category(db: Session, cat: Category, data: CategoryUpdate) -> Category:
    for field in data.model_fields_set:
        setattr(cat, field, getattr(data, field))
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, cat: Category) -> None:
    db.delete(cat)
    db.commit()
