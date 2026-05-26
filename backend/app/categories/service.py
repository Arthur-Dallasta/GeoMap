from sqlalchemy.orm import Session

from app.categories.models import Category


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).all()


def get_category(db: Session, cat_id) -> Category | None:
    return db.get(Category, cat_id)
