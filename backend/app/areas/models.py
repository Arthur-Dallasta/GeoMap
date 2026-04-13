# backend/app/areas/models.py
import uuid
from datetime import datetime

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(10))  # "boundary" ou "internal"
    geometry: Mapped[WKBElement] = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
