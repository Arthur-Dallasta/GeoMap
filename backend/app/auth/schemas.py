import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.auth.models import SexEnum


class RegisterRequest(BaseModel):
    name: str
    cpf: str
    sex: SexEnum
    email: EmailStr
    password: str

    @field_validator("cpf")
    @classmethod
    def validate_cpf_format(cls, v: str) -> str:
        pattern = r"^\d{3}\.\d{3}\.\d{3}-\d{2}$"
        if not re.match(pattern, v):
            raise ValueError("CPF deve estar no formato XXX.XXX.XXX-XX")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    cpf: str
    sex: SexEnum
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v
