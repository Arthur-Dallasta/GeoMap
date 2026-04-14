# backend/tests/test_categories.py
import pytest
from pydantic import ValidationError

def test_category_create_rejects_invalid_color():
    from app.categories.schemas import CategoryCreate
    with pytest.raises(ValidationError):
        CategoryCreate(name="Plantio", color="#000000")

def test_category_create_accepts_valid_color():
    from app.categories.schemas import CategoryCreate
    cat = CategoryCreate(name="Plantio", color="#ef4444")
    assert cat.color == "#ef4444"
    assert cat.description is None
