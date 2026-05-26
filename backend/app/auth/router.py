from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import service
from app.auth.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if service.get_user_by_email(db, body.email):
        raise HTTPException(status_code=409, detail="Email já cadastrado")
    if service.get_user_by_cpf(db, body.cpf):
        raise HTTPException(status_code=409, detail="CPF já cadastrado")
    user = service.create_user(
        db,
        name=body.name,
        cpf=body.cpf,
        sex=body.sex,
        email=body.email,
        password=body.password,
    )
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = service.authenticate(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = service.get_user_by_email(db, body.email)
    if user:
        token = service.create_reset_token(db, user)
        print(f"[DEV] Reset link: http://localhost:5173/reset-password?token={token}")
    return {"message": "Se o email existir, o link de redefinição foi enviado"}


@router.post("/reset-password/confirm")
def reset_password_confirm(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = service.reset_password(db, body.token, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    return {"message": "Senha redefinida com sucesso"}
