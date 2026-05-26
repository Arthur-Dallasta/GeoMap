import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PropertyBase(BaseModel):
    name: str
    location: str
    municipality: str
    state: str
    zip_code: str
    total_area_ha: Decimal
    own_area_ha: Decimal
    leased_area_ha: Decimal
    protected_area_ha: Decimal
    people_count: int
    crop_area_ha: Decimal


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(PropertyBase):
    pass


class PropertyResponse(PropertyBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
