import uuid

from sqlalchemy.orm import Session

from app.properties.models import Property


def list_properties(db: Session, user_id: uuid.UUID) -> list[Property]:
    return db.query(Property).filter(Property.user_id == user_id).all()


def get_property(db: Session, property_id: uuid.UUID, user_id: uuid.UUID) -> Property | None:
    return (
        db.query(Property)
        .filter(Property.id == property_id, Property.user_id == user_id)
        .first()
    )


def create_property(db: Session, user_id: uuid.UUID, data: dict) -> Property:
    prop = Property(id=uuid.uuid4(), user_id=user_id, **data)
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def update_property(db: Session, prop: Property, data: dict) -> Property:
    for key, value in data.items():
        setattr(prop, key, value)
    db.commit()
    db.refresh(prop)
    return prop


def delete_property(db: Session, prop: Property) -> None:
    db.delete(prop)
    db.commit()
