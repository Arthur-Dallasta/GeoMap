import uuid
from datetime import datetime

from pydantic import BaseModel


class SubcategoryCreate(BaseModel):
    category_id: uuid.UUID
    name: str
    description: str | None = None


class SubcategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class SubcategoryResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    property_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
