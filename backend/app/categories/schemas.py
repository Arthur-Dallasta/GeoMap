import uuid
from datetime import datetime

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: uuid.UUID
    key: str
    name: str
    color: str
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
