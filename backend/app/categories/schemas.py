# backend/app/categories/schemas.py
import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

VALID_COLORS = {
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#3b82f6", "#6366f1", "#a855f7",
    "#ec4899", "#f43f5e", "#84cc16", "#06b6d4",
}


class CategoryCreate(BaseModel):
    name: str
    color: str
    description: str | None = None

    @field_validator("color")
    @classmethod
    def color_must_be_in_palette(cls, v: str) -> str:
        if v not in VALID_COLORS:
            raise ValueError("Invalid color")
        return v


class CategoryUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    description: str | None = None

    @field_validator("color")
    @classmethod
    def color_must_be_in_palette(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_COLORS:
            raise ValueError("Invalid color")
        return v


class CategoryResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    name: str
    color: str
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
