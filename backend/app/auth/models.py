import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SexEnum(str, enum.Enum):
    M = "M"
    F = "F"
    O = "O"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200))
    cpf: Mapped[str] = mapped_column(String(14), unique=True)
    sex: Mapped[SexEnum] = mapped_column(Enum(SexEnum, name="sex_enum"))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(200))
    reset_token: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reset_token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
