# backend/app/areas/schemas.py
import uuid
from typing import Any

from pydantic import BaseModel


class AreaResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    type: str
    geometry: dict[str, Any]

    model_config = {"from_attributes": True}


class AreaFeature(BaseModel):
    """GeoJSON Feature wrapping an Area."""
    type: str = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any]


class AreaListResponse(BaseModel):
    boundary: AreaFeature | None
    internal: list[AreaFeature]


class AreaAssignRequest(BaseModel):
    category_id: uuid.UUID | None
