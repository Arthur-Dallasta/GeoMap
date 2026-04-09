# Fase 1 — Auth + Propriedades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produtor autenticado pode cadastrar, editar e excluir propriedades rurais com isolamento completo de dados por tenant.

**Architecture:** Monorepo com `frontend/` (React 19 + Vite 6 + TypeScript) e `backend/` (FastAPI + SQLAlchemy 2.0 + PostgreSQL + PostGIS). Backend organizado por domínio (`auth/`, `properties/`, `core/`). Comunicação via REST API com JWT Bearer.

**Tech Stack:** FastAPI 0.115, SQLAlchemy 2.0, Alembic, psycopg2, python-jose, passlib/bcrypt, React 19, React Router v7, react-hook-form, zod, Tailwind CSS 4, shadcn/ui, Vitest, pytest

---

## Estrutura de Arquivos

```
GeoMap/
├── docker-compose.yml
├── .env.example
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── types/index.ts
│       ├── lib/
│       │   ├── api.ts
│       │   └── utils.ts
│       ├── hooks/
│       │   └── useAuth.tsx
│       ├── components/
│       │   ├── AuthLayout.tsx
│       │   ├── AppLayout.tsx
│       │   ├── PropertyCard.tsx
│       │   └── PropertyForm.tsx
│       └── pages/
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── ForgotPassword.tsx
│           ├── ResetPassword.tsx
│           ├── Dashboard.tsx
│           ├── PropertyNew.tsx
│           ├── PropertyDetail.tsx
│           └── PropertyEdit.tsx
└── backend/
    ├── main.py
    ├── requirements.txt
    ├── .env.example
    ├── alembic.ini
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    │       └── 001_initial.py
    ├── tests/
    │   ├── conftest.py
    │   ├── test_auth.py
    │   └── test_properties.py
    └── app/
        ├── core/
        │   ├── config.py
        │   ├── database.py
        │   ├── security.py
        │   └── deps.py
        ├── auth/
        │   ├── models.py
        │   ├── schemas.py
        │   ├── service.py
        │   └── router.py
        └── properties/
            ├── models.py
            ├── schemas.py
            ├── service.py
            └── router.py
```

---

## Task 1: Docker Compose + Raiz do Monorepo

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Criar docker-compose.yml**

```yaml
# docker-compose.yml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: geomap
      POSTGRES_PASSWORD: geomap
      POSTGRES_DB: geomap
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 2: Criar .env.example**

```bash
# .env.example (raiz do projeto — referência)
# Copie para backend/.env antes de rodar
DATABASE_URL=postgresql://geomap:geomap@localhost:5432/geomap
SECRET_KEY=troque-me-em-producao
```

- [ ] **Step 3: Subir o banco e verificar**

```bash
docker compose up -d
docker compose ps
```

Esperado: serviço `db` com status `running` e porta `5432` mapeada.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add docker-compose with PostgreSQL + PostGIS"
```

---

## Task 2: Scaffold do Backend

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/main.py`
- Create: `backend/app/__init__.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/properties/__init__.py`

- [ ] **Step 1: Criar requirements.txt**

```
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.36
alembic==1.13.3
geoalchemy2==0.15.2
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
pydantic-settings==2.4.0
pydantic[email]==2.8.2
pytest==8.3.3
httpx==0.27.2
```

- [ ] **Step 2: Criar backend/.env.example**

```bash
# backend/.env.example
DATABASE_URL=postgresql://geomap:geomap@localhost:5432/geomap
SECRET_KEY=troque-me-em-producao
```

Copiar para `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

- [ ] **Step 3: Criar main.py (esqueleto)**

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="GeoMap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Criar arquivos __init__.py**

```bash
touch backend/app/__init__.py
touch backend/app/core/__init__.py
touch backend/app/auth/__init__.py
touch backend/app/properties/__init__.py
touch backend/tests/__init__.py
```

- [ ] **Step 5: Instalar dependências e verificar**

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Acesse http://localhost:8000/health — esperado: `{"status": "ok"}`

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "chore: scaffold backend FastAPI project"
```

---

## Task 3: Core — Config + Database

**Files:**
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`

- [ ] **Step 1: Criar config.py**

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://geomap:geomap@localhost:5432/geomap"
    SECRET_KEY: str = "troque-me-em-producao"

    model_config = {"env_file": ".env"}


settings = Settings()
```

- [ ] **Step 2: Criar database.py**

```python
# backend/app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 3: Verificar importação**

```bash
cd backend
python -c "from app.core.database import Base, get_db; print('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/config.py backend/app/core/database.py
git commit -m "feat: add core config and database session"
```

---

## Task 4: Core — Security + Deps

**Files:**
- Create: `backend/app/core/security.py`
- Create: `backend/app/core/deps.py`

- [ ] **Step 1: Criar security.py**

```python
# backend/app/core/security.py
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
```

- [ ] **Step 2: Criar deps.py**

```python
# backend/app/core/deps.py
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )
    # Import here to avoid circular imports
    from app.auth.models import User

    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
        )
    return user
```

- [ ] **Step 3: Verificar importações**

```bash
cd backend
python -c "from app.core.security import hash_password, create_access_token; print('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/security.py backend/app/core/deps.py
git commit -m "feat: add JWT security and auth dependency"
```

---

## Task 5: Auth — Models + Schemas

**Files:**
- Create: `backend/app/auth/models.py`
- Create: `backend/app/auth/schemas.py`

- [ ] **Step 1: Criar models.py**

```python
# backend/app/auth/models.py
import enum
import uuid
from datetime import datetime

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
    reset_token: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reset_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 2: Criar schemas.py**

```python
# backend/app/auth/schemas.py
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
```

- [ ] **Step 3: Verificar importações**

```bash
cd backend
python -c "from app.auth.models import User; from app.auth.schemas import RegisterRequest; print('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/auth/models.py backend/app/auth/schemas.py
git commit -m "feat: add User model and auth schemas"
```

---

## Task 6: Test Infrastructure

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/pytest.ini`

- [ ] **Step 1: Criar pytest.ini**

```ini
# backend/pytest.ini
[pytest]
testpaths = tests
```

- [ ] **Step 2: Criar conftest.py**

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db

# Banco de dados de teste separado
TEST_DB_URL = settings.DATABASE_URL.replace("/geomap", "/geomap_test")

test_engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def client():
    # Importar modelos para registrá-los no Base.metadata
    # Nota: app.properties.models será adicionado na Task 9
    import app.auth.models  # noqa: F401

    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    from main import app

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
```

- [ ] **Step 3: Criar banco de teste**

```bash
docker exec -it $(docker compose ps -q db) psql -U geomap -c "CREATE DATABASE geomap_test;"
```

- [ ] **Step 4: Verificar que o conftest carrega sem erros**

```bash
cd backend
python -m pytest --collect-only
```

Esperado: sem erros de importação (pode mostrar "no tests ran").

- [ ] **Step 5: Commit**

```bash
git add backend/tests/conftest.py backend/pytest.ini
git commit -m "test: add pytest infrastructure with test database"
```

---

## Task 7: Auth Service + Testes

**Files:**
- Create: `backend/tests/test_auth.py`
- Create: `backend/app/auth/service.py`

- [ ] **Step 1: Escrever testes (falharão — service não existe)**

```python
# backend/tests/test_auth.py


def test_register_success(client):
    res = client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client):
    payload = {
        "name": "João Silva",
        "cpf": "123.456.789-09",
        "sex": "M",
        "email": "joao@exemplo.com",
        "password": "senha123",
    }
    client.post("/api/auth/register", json=payload)
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 409


def test_register_invalid_cpf(client):
    res = client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "12345678909",  # sem pontuação
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    assert res.status_code == 422


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "joao@exemplo.com", "password": "senha123"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "joao@exemplo.com", "password": "errada"},
    )
    assert res.status_code == 401


def test_me_authenticated(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    token = reg.json()["access_token"]
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "joao@exemplo.com"


def test_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_forgot_password_logs_link(client, capsys):
    client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "joao@exemplo.com"},
    )
    assert res.status_code == 200
    captured = capsys.readouterr()
    assert "reset" in captured.out.lower() or "token" in captured.out.lower()
```

- [ ] **Step 2: Rodar testes — devem falhar**

```bash
cd backend
python -m pytest tests/test_auth.py -v
```

Esperado: `ERROR` ou `FAILED` com `ModuleNotFoundError` ou `404` (router não existe).

- [ ] **Step 3: Criar service.py**

```python
# backend/app/auth/service.py
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.security import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_cpf(db: Session, cpf: str) -> User | None:
    return db.query(User).filter(User.cpf == cpf).first()


def create_user(db: Session, name: str, cpf: str, sex: str, email: str, password: str) -> User:
    user = User(
        id=uuid.uuid4(),
        name=name,
        cpf=cpf,
        sex=sex,
        email=email,
        password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        return None
    return user


def create_reset_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
    db.commit()
    return token


def reset_password(db: Session, token: str, new_password: str) -> bool:
    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        return False
    if user.reset_token_expires_at < datetime.now(timezone.utc):
        return False
    user.password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()
    return True
```

- [ ] **Step 4: Criar router.py**

```python
# backend/app/auth/router.py
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
    # Retornar sempre 200 para não vazar se email existe
    return {"message": "Se o email existir, o link de redefinição foi enviado"}


@router.post("/reset-password/confirm")
def reset_password_confirm(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = service.reset_password(db, body.token, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    return {"message": "Senha redefinida com sucesso"}
```

- [ ] **Step 5: Registrar o router em main.py**

```python
# backend/main.py  (versão completa)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router

app = FastAPI(title="GeoMap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Rodar testes — devem passar**

```bash
cd backend
python -m pytest tests/test_auth.py -v
```

Esperado: todos os testes `PASSED`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/auth/ backend/tests/test_auth.py backend/main.py
git commit -m "feat: implement auth module (register, login, me, password reset)"
```

---

## Task 8: Alembic — Migration Inicial

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/001_initial.py`

- [ ] **Step 1: Inicializar Alembic**

```bash
cd backend
alembic init alembic
```

- [ ] **Step 2: Editar alembic/env.py para importar os modelos**

```python
# backend/alembic/env.py
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Importar Base e todos os modelos
# Nota: app.properties.models será adicionado na Task 9
from app.core.database import Base
import app.auth.models  # noqa: F401 — registra User no metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.config_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Editar alembic.ini para usar a DATABASE_URL**

No arquivo `backend/alembic.ini`, alterar a linha `sqlalchemy.url`:

```ini
sqlalchemy.url = postgresql://geomap:geomap@localhost:5432/geomap
```

- [ ] **Step 4: Gerar a migration inicial**

```bash
cd backend
alembic revision --autogenerate -m "initial"
```

Verificar que o arquivo gerado em `alembic/versions/` contém a tabela `users`. A tabela `properties` será adicionada na Task 9 (após criar o modelo).

- [ ] **Step 5: Adicionar ativação do PostGIS na migration**

Editar o arquivo gerado em `alembic/versions/` para adicionar a extensão PostGIS:

```python
def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    # ... resto do código gerado pelo autogenerate
```

- [ ] **Step 6: Rodar a migration**

```bash
cd backend
alembic upgrade head
```

Esperado: sem erros. A tabela `users` existe no banco.

- [ ] **Step 7: Commit**

```bash
git add backend/alembic/ backend/alembic.ini
git commit -m "feat: add Alembic with initial migration (users table + PostGIS)"
```

---

## Task 9: Properties — Models + Schemas

**Files:**
- Create: `backend/app/properties/models.py`
- Create: `backend/app/properties/schemas.py`

- [ ] **Step 1: Criar models.py**

```python
# backend/app/properties/models.py
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    location: Mapped[str] = mapped_column(String(300))
    municipality: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(2))
    zip_code: Mapped[str] = mapped_column(String(9))
    total_area_ha: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    own_area_ha: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    leased_area_ha: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    protected_area_ha: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    people_count: Mapped[int] = mapped_column(Integer)
    crop_area_ha: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 2: Criar schemas.py**

```python
# backend/app/properties/schemas.py
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
```

- [ ] **Step 3: Atualizar alembic/env.py para incluir o novo modelo**

```python
# backend/alembic/env.py — alterar o bloco de imports para:
from app.core.database import Base
import app.auth.models  # noqa: F401
import app.properties.models  # noqa: F401 — adicionar esta linha
```

- [ ] **Step 4: Atualizar tests/conftest.py para incluir o novo modelo**

```python
# backend/tests/conftest.py — alterar o bloco de imports dentro do fixture para:
    import app.auth.models  # noqa: F401
    import app.properties.models  # noqa: F401 — adicionar esta linha
```

- [ ] **Step 5: Gerar migration para a tabela properties**

```bash
cd backend
alembic revision --autogenerate -m "add properties table"
alembic upgrade head
```

Esperado: tabela `properties` criada no banco.

- [ ] **Step 6: Commit**

```bash
git add backend/app/properties/models.py backend/app/properties/schemas.py backend/alembic/ backend/tests/conftest.py
git commit -m "feat: add Property model and schemas, migration for properties table"
```

---

## Task 10: Properties — Service + Router + Testes

**Files:**
- Create: `backend/tests/test_properties.py`
- Create: `backend/app/properties/service.py`
- Create: `backend/app/properties/router.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Escrever testes (falharão — router não existe)**

```python
# backend/tests/test_properties.py

REGISTER_PAYLOAD = {
    "name": "João Silva",
    "cpf": "123.456.789-09",
    "sex": "M",
    "email": "joao@exemplo.com",
    "password": "senha123",
}

PROPERTY_PAYLOAD = {
    "name": "Fazenda São João",
    "location": "Estrada Rural km 10",
    "municipality": "Ribeirão Preto",
    "state": "SP",
    "zip_code": "14000-000",
    "total_area_ha": "100.5000",
    "own_area_ha": "80.0000",
    "leased_area_ha": "20.5000",
    "protected_area_ha": "15.0000",
    "people_count": 5,
    "crop_area_ha": "60.0000",
}


def _auth_header(client) -> dict:
    res = client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_property(client):
    headers = _auth_header(client)
    res = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Fazenda São João"
    assert "id" in data


def test_list_properties_only_own(client):
    # Usuário 1
    headers1 = _auth_header(client)
    client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers1)

    # Usuário 2
    payload2 = {**REGISTER_PAYLOAD, "email": "outro@exemplo.com", "cpf": "987.654.321-00"}
    res2 = client.post("/api/auth/register", json=payload2)
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}
    client.post("/api/properties/", json={**PROPERTY_PAYLOAD, "name": "Outra Fazenda"}, headers=headers2)

    res = client.get("/api/properties/", headers=headers1)
    assert res.status_code == 200
    props = res.json()
    assert len(props) == 1
    assert props[0]["name"] == "Fazenda São João"


def test_get_property(client):
    headers = _auth_header(client)
    created = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers).json()
    res = client.get(f"/api/properties/{created['id']}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]


def test_get_property_of_other_user_returns_404(client):
    headers1 = _auth_header(client)
    created = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers1).json()

    payload2 = {**REGISTER_PAYLOAD, "email": "outro@exemplo.com", "cpf": "987.654.321-00"}
    res2 = client.post("/api/auth/register", json=payload2)
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}

    res = client.get(f"/api/properties/{created['id']}", headers=headers2)
    assert res.status_code == 404


def test_update_property(client):
    headers = _auth_header(client)
    created = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers).json()
    updated = {**PROPERTY_PAYLOAD, "name": "Fazenda Atualizada"}
    res = client.put(f"/api/properties/{created['id']}", json=updated, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Fazenda Atualizada"


def test_delete_property(client):
    headers = _auth_header(client)
    created = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers).json()
    res = client.delete(f"/api/properties/{created['id']}", headers=headers)
    assert res.status_code == 204
    get_res = client.get(f"/api/properties/{created['id']}", headers=headers)
    assert get_res.status_code == 404
```

- [ ] **Step 2: Rodar — devem falhar**

```bash
cd backend
python -m pytest tests/test_properties.py -v
```

Esperado: `FAILED` com `404` (router não registrado).

- [ ] **Step 3: Criar service.py**

```python
# backend/app/properties/service.py
import uuid

from sqlalchemy.orm import Session

from app.properties.models import Property


def list_properties(db: Session, user_id: uuid.UUID) -> list[Property]:
    return db.query(Property).filter(Property.user_id == user_id).all()


def get_property(db: Session, property_id: uuid.UUID, user_id: uuid.UUID) -> Property | None:
    return (
        db.query(Property)
        .filter(Property.id == property_id, Property.user_id == user_id)
        .first()
    )


def create_property(db: Session, user_id: uuid.UUID, data: dict) -> Property:
    prop = Property(id=uuid.uuid4(), user_id=user_id, **data)
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def update_property(db: Session, prop: Property, data: dict) -> Property:
    for key, value in data.items():
        setattr(prop, key, value)
    db.commit()
    db.refresh(prop)
    return prop


def delete_property(db: Session, prop: Property) -> None:
    db.delete(prop)
    db.commit()
```

- [ ] **Step 4: Criar router.py**

```python
# backend/app/properties/router.py
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.database import get_db
from app.core.deps import get_current_user
from app.properties import service
from app.properties.schemas import PropertyCreate, PropertyResponse, PropertyUpdate

router = APIRouter(prefix="/api/properties", tags=["properties"])


@router.get("/", response_model=list[PropertyResponse])
def list_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.list_properties(db, current_user.id)


@router.post("/", response_model=PropertyResponse, status_code=201)
def create_property(
    body: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.create_property(db, current_user.id, body.model_dump())


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada")
    return prop


@router.put("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: uuid.UUID,
    body: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada")
    return service.update_property(db, prop, body.model_dump())


@router.delete("/{property_id}", status_code=204)
def delete_property(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada")
    service.delete_property(db, prop)
```

- [ ] **Step 5: Registrar router em main.py**

```python
# backend/main.py (versão final)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.properties.router import router as properties_router

app = FastAPI(title="GeoMap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(properties_router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Rodar todos os testes — devem passar**

```bash
cd backend
python -m pytest -v
```

Esperado: todos os testes `PASSED`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/properties/ backend/tests/test_properties.py backend/main.py
git commit -m "feat: implement properties CRUD with tenant isolation"
```

---

## Task 11: Frontend — Scaffold (Vite + React + TypeScript)

**Files:**
- Create: `frontend/` (via Vite CLI)

- [ ] **Step 1: Criar projeto Vite**

```bash
cd GeoMap  # raiz do monorepo
npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Instalar dependências**

```bash
cd frontend
npm install
npm install react-router-dom react-hook-form zod @hookform/resolvers
npm install lucide-react
npm install -D @types/geojson vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configurar Vite com Vitest**

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

- [ ] **Step 4: Criar test-setup.ts**

```typescript
// frontend/src/test-setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Atualizar tsconfig.app.json para incluir tipos de teste**

```json
// frontend/tsconfig.app.json — adicionar "types" em compilerOptions
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

- [ ] **Step 6: Verificar que o projeto inicia**

```bash
cd frontend
npm run dev
```

Acesse http://localhost:5173 — esperado: página padrão do Vite+React.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold frontend with Vite + React + TypeScript + Vitest"
```

---

## Task 12: Frontend — Tailwind + shadcn/ui

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/index.css`
- Create: componentes via shadcn CLI

- [ ] **Step 1: Instalar Tailwind CSS v4**

```bash
cd frontend
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Adicionar plugin Tailwind no vite.config.ts**

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

- [ ] **Step 3: Configurar index.css**

```css
/* frontend/src/index.css */
@import "tailwindcss";

:root {
  --primary: 142 71% 29%;
  --primary-foreground: 0 0% 98%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 98%;
}
```

- [ ] **Step 4: Inicializar shadcn/ui**

```bash
cd frontend
npx shadcn@latest init
```

Quando solicitado:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

- [ ] **Step 5: Adicionar componentes shadcn necessários**

```bash
npx shadcn@latest add button input label form card toast select dialog
```

- [ ] **Step 6: Verificar que o app compila sem erros**

```bash
npm run build
```

Esperado: build bem-sucedido sem erros.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "chore: add Tailwind CSS v4 and shadcn/ui components"
```

---

## Task 13: Frontend — Types + API Client + Utils

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Escrever teste para formatCpf**

```typescript
// frontend/src/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { formatCpf } from "./utils";

describe("formatCpf", () => {
  it("formats 11 digits to CPF mask", () => {
    expect(formatCpf("12345678909")).toBe("123.456.789-09");
  });

  it("returns partial input unchanged if less than 11 digits", () => {
    expect(formatCpf("123")).toBe("123");
  });

  it("strips non-digits before formatting", () => {
    expect(formatCpf("123.456.789-09")).toBe("123.456.789-09");
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
cd frontend
npx vitest run src/lib/utils.test.ts
```

Esperado: `FAIL` com `Cannot find module './utils'`.

- [ ] **Step 3: Criar types/index.ts**

```typescript
// frontend/src/types/index.ts
export interface User {
  id: string;
  name: string;
  cpf: string;
  sex: "M" | "F" | "O";
  email: string;
  created_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  name: string;
  location: string;
  municipality: string;
  state: string;
  zip_code: string;
  total_area_ha: string;
  own_area_ha: string;
  leased_area_ha: string;
  protected_area_ha: string;
  people_count: number;
  crop_area_ha: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
```

- [ ] **Step 4: Criar lib/utils.ts**

```typescript
// frontend/src/lib/utils.ts

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 11) return digits;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 5: Criar lib/api.ts**

```typescript
// frontend/src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw new ApiError(res.status, body.detail || "Erro na requisição");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { ApiError };
```

- [ ] **Step 6: Criar .env**

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000/api
```

- [ ] **Step 7: Rodar testes — devem passar**

```bash
cd frontend
npx vitest run src/lib/utils.test.ts
```

Esperado: `PASS`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/ frontend/src/lib/ frontend/.env
git commit -m "feat: add TypeScript types, API client, and utils"
```

---

## Task 14: Frontend — Auth Context (useAuth)

**Files:**
- Create: `frontend/src/hooks/useAuth.tsx`

- [ ] **Step 1: Criar useAuth.tsx**

```typescript
// frontend/src/hooks/useAuth.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    cpf: string;
    sex: "M" | "F" | "O";
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setState({ user: null, isLoading: false });
      return;
    }
    try {
      const user = await api.get<User>("/auth/me");
      setState({ user, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      setState({ user: null, isLoading: false });
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.post<{ access_token: string }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("token", access_token);
    const user = await api.get<User>("/auth/me");
    setState({ user, isLoading: false });
  }, []);

  const register = useCallback(
    async (data: {
      name: string;
      cpf: string;
      sex: "M" | "F" | "O";
      email: string;
      password: string;
    }) => {
      const { access_token } = await api.post<{ access_token: string }>("/auth/register", data);
      localStorage.setItem("token", access_token);
      const user = await api.get<User>("/auth/me");
      setState({ user, isLoading: false });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setState({ user: null, isLoading: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useAuth.tsx
git commit -m "feat: add AuthProvider and useAuth hook"
```

---

## Task 15: Frontend — App.tsx + Routing + Layouts

**Files:**
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/AuthLayout.tsx`
- Create: `frontend/src/components/AppLayout.tsx`

- [ ] **Step 1: Atualizar main.tsx**

```typescript
// frontend/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./hooks/useAuth.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Criar App.tsx com rotas**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyEdit from "./pages/PropertyEdit";
import PropertyNew from "./pages/PropertyNew";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/properties/new" element={<PrivateRoute><PropertyNew /></PrivateRoute>} />
        <Route path="/properties/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
        <Route path="/properties/:id/edit" element={<PrivateRoute><PropertyEdit /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Criar AuthLayout.tsx**

```typescript
// frontend/src/components/AuthLayout.tsx
interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted py-12 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-8">GeoMap</h1>
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-semibold mb-6">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Criar AppLayout.tsx**

```typescript
// frontend/src/components/AppLayout.tsx
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-xl font-semibold text-primary">
          GeoMap
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Criar páginas placeholder para não ter erros de import**

```typescript
// Criar arquivos temporários para cada página ainda não implementada:
// frontend/src/pages/Dashboard.tsx
export default function Dashboard() { return <div>Dashboard</div>; }

// frontend/src/pages/Login.tsx
export default function Login() { return <div>Login</div>; }

// frontend/src/pages/Register.tsx
export default function Register() { return <div>Register</div>; }

// frontend/src/pages/ForgotPassword.tsx
export default function ForgotPassword() { return <div>ForgotPassword</div>; }

// frontend/src/pages/ResetPassword.tsx
export default function ResetPassword() { return <div>ResetPassword</div>; }

// frontend/src/pages/PropertyNew.tsx
export default function PropertyNew() { return <div>PropertyNew</div>; }

// frontend/src/pages/PropertyDetail.tsx
export default function PropertyDetail() { return <div>PropertyDetail</div>; }

// frontend/src/pages/PropertyEdit.tsx
export default function PropertyEdit() { return <div>PropertyEdit</div>; }
```

Criar todos os arquivos acima com o conteúdo placeholder correspondente.

- [ ] **Step 6: Verificar que o app compila**

```bash
cd frontend
npm run build
```

Esperado: build sem erros.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add routing, AuthLayout, AppLayout, and page placeholders"
```

---

## Task 16: Frontend — Páginas de Auth (Login + Register)

**Files:**
- Modify: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/pages/Register.tsx`

- [ ] **Step 1: Implementar Login.tsx**

```typescript
// frontend/src/pages/Login.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../hooks/useAuth";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fazer login");
    }
  }

  return (
    <AuthLayout title="Entrar">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Cadastre-se
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 2: Implementar Register.tsx**

```typescript
// frontend/src/pages/Register.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../hooks/useAuth";
import { formatCpf } from "../lib/utils";

const schema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato XXX.XXX.XXX-XX"),
  sex: z.enum(["M", "F", "O"], { required_error: "Selecione o sexo" }),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const cpfValue = watch("cpf", "");

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCpf(e.target.value);
    setValue("cpf", formatted, { shouldValidate: true });
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await registerUser(data);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cadastrar");
    }
  }

  return (
    <AuthLayout title="Criar conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={cpfValue}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            maxLength={14}
          />
          {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Sexo</Label>
          <Select onValueChange={(v) => setValue("sex", v as "M" | "F" | "O")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Feminino</SelectItem>
              <SelectItem value="O">Outro</SelectItem>
            </SelectContent>
          </Select>
          {errors.sex && <p className="text-sm text-destructive">{errors.sex.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Cadastrando..." : "Cadastrar"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Rodar build para verificar**

```bash
cd frontend
npm run build
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Register.tsx
git commit -m "feat: implement Login and Register pages"
```

---

## Task 17: Frontend — ForgotPassword + ResetPassword

**Files:**
- Modify: `frontend/src/pages/ForgotPassword.tsx`
- Modify: `frontend/src/pages/ResetPassword.tsx`

- [ ] **Step 1: Implementar ForgotPassword.tsx**

```typescript
// frontend/src/pages/ForgotPassword.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { api } from "../lib/api";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao solicitar redefinição");
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Email enviado">
        <p className="text-muted-foreground text-center">
          Se o email estiver cadastrado, você receberá um link para redefinir sua senha em breve.
        </p>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-primary hover:underline text-sm">
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueci minha senha">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Informe seu email para receber o link de redefinição de senha.
        </p>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar link"}
        </Button>

        <div className="text-center">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Voltar ao login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 2: Implementar ResetPassword.tsx**

```typescript
// frontend/src/pages/ResetPassword.tsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { api } from "../lib/api";

const schema = z
  .object({
    new_password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "As senhas não coincidem",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthLayout title="Link inválido">
        <p className="text-muted-foreground text-center">
          Este link de redefinição é inválido ou expirou.
        </p>
        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-primary hover:underline text-sm">
            Solicitar novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await api.post("/auth/reset-password/confirm", {
        token,
        new_password: data.new_password,
      });
      navigate("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao redefinir senha");
    }
  }

  return (
    <AuthLayout title="Nova senha">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new_password">Nova senha</Label>
          <Input id="new_password" type="password" {...register("new_password")} />
          {errors.new_password && (
            <p className="text-sm text-destructive">{errors.new_password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmar senha</Label>
          <Input id="confirm_password" type="password" {...register("confirm_password")} />
          {errors.confirm_password && (
            <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ForgotPassword.tsx frontend/src/pages/ResetPassword.tsx
git commit -m "feat: implement ForgotPassword and ResetPassword pages"
```

---

## Task 18: Frontend — Dashboard + PropertyCard

**Files:**
- Create: `frontend/src/components/PropertyCard.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Criar PropertyCard.tsx**

```typescript
// frontend/src/components/PropertyCard.tsx
import { MapPin, Users, Maximize } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import type { Property } from "../types";

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{property.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {property.municipality} — {property.state}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Maximize className="h-4 w-4" />
          <span>{Number(property.total_area_ha).toLocaleString("pt-BR")} ha</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{property.people_count} pessoas</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/properties/${property.id}`}>Ver detalhes</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/properties/${property.id}/edit`}>Editar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Implementar Dashboard.tsx**

```typescript
// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import AppLayout from "../components/AppLayout";
import PropertyCard from "../components/PropertyCard";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import type { Property } from "../types";

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Property[]>("/properties/")
      .then(setProperties)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Minhas Propriedades</h1>
        <Button asChild>
          <Link to="/properties/new">
            <Plus className="h-4 w-4 mr-2" />
            Nova propriedade
          </Link>
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!isLoading && !error && properties.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">Nenhuma propriedade cadastrada ainda.</p>
          <Button asChild>
            <Link to="/properties/new">Cadastrar primeira propriedade</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PropertyCard.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat: implement Dashboard and PropertyCard"
```

---

## Task 19: Frontend — PropertyForm

**Files:**
- Create: `frontend/src/components/PropertyForm.tsx`

- [ ] **Step 1: Criar PropertyForm.tsx**

```typescript
// frontend/src/components/PropertyForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import type { Property } from "../types";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  location: z.string().min(1, "Localização é obrigatória"),
  municipality: z.string().min(1, "Município é obrigatório"),
  state: z.string().length(2, "Use a sigla do estado (2 letras)"),
  zip_code: z
    .string()
    .regex(/^\d{5}-\d{3}$/, "CEP deve estar no formato XXXXX-XXX"),
  total_area_ha: z.coerce.number().positive("Deve ser maior que zero"),
  own_area_ha: z.coerce.number().min(0, "Deve ser maior ou igual a zero"),
  leased_area_ha: z.coerce.number().min(0),
  protected_area_ha: z.coerce.number().min(0),
  people_count: z.coerce.number().int().positive("Deve ser pelo menos 1"),
  crop_area_ha: z.coerce.number().min(0),
});

export type PropertyFormData = z.infer<typeof schema>;

interface PropertyFormProps {
  defaultValues?: Partial<PropertyFormData>;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  submitLabel?: string;
}

export default function PropertyForm({
  defaultValues,
  onSubmit,
  submitLabel = "Salvar",
}: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Identificação
        </h3>
        <div className="space-y-2">
          <Label htmlFor="name">Nome da propriedade</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Localização
        </h3>
        <div className="space-y-2">
          <Label htmlFor="location">Endereço / localização</Label>
          <Input id="location" {...register("location")} />
          {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="municipality">Município</Label>
            <Input id="municipality" {...register("municipality")} />
            {errors.municipality && (
              <p className="text-sm text-destructive">{errors.municipality.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado (sigla)</Label>
            <Input id="state" maxLength={2} {...register("state")} />
            {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip_code">CEP</Label>
          <Input id="zip_code" placeholder="00000-000" maxLength={9} {...register("zip_code")} />
          {errors.zip_code && <p className="text-sm text-destructive">{errors.zip_code.message}</p>}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Áreas (hectares)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="total_area_ha">Área total (ha)</Label>
            <Input id="total_area_ha" type="number" step="0.0001" {...register("total_area_ha")} />
            {errors.total_area_ha && (
              <p className="text-sm text-destructive">{errors.total_area_ha.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="own_area_ha">Área própria (ha)</Label>
            <Input id="own_area_ha" type="number" step="0.0001" {...register("own_area_ha")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leased_area_ha">Área arrendada (ha)</Label>
            <Input id="leased_area_ha" type="number" step="0.0001" {...register("leased_area_ha")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protected_area_ha">Área protegida (ha)</Label>
            <Input
              id="protected_area_ha"
              type="number"
              step="0.0001"
              {...register("protected_area_ha")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crop_area_ha">Área de produção vegetal (ha)</Label>
            <Input id="crop_area_ha" type="number" step="0.0001" {...register("crop_area_ha")} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Pessoas
        </h3>
        <div className="space-y-2">
          <Label htmlFor="people_count">Pessoas envolvidas na produção</Label>
          <Input id="people_count" type="number" min={1} {...register("people_count")} />
          {errors.people_count && (
            <p className="text-sm text-destructive">{errors.people_count.message}</p>
          )}
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">
        {isSubmitting ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PropertyForm.tsx
git commit -m "feat: implement reusable PropertyForm component"
```

---

## Task 20: Frontend — Páginas de Propriedade (New + Detail + Edit)

**Files:**
- Modify: `frontend/src/pages/PropertyNew.tsx`
- Modify: `frontend/src/pages/PropertyDetail.tsx`
- Modify: `frontend/src/pages/PropertyEdit.tsx`

- [ ] **Step 1: Implementar PropertyNew.tsx**

```typescript
// frontend/src/pages/PropertyNew.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import PropertyForm, { type PropertyFormData } from "../components/PropertyForm";
import { api } from "../lib/api";
import type { Property } from "../types";

export default function PropertyNew() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(data: PropertyFormData) {
    setError(null);
    try {
      const created = await api.post<Property>("/properties/", data);
      navigate(`/properties/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar propriedade");
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6">Nova Propriedade</h1>
        {error && <p className="text-destructive mb-4">{error}</p>}
        <PropertyForm onSubmit={onSubmit} submitLabel="Cadastrar propriedade" />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Implementar PropertyDetail.tsx**

```typescript
// frontend/src/pages/PropertyDetail.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import type { Property } from "../types";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Property>(`/properties/${id}`)
      .then(setProperty)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm("Deseja excluir esta propriedade? Esta ação não pode ser desfeita.")) return;
    try {
      await api.delete(`/properties/${id}`);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  if (isLoading) return <AppLayout><p>Carregando...</p></AppLayout>;
  if (error) return <AppLayout><p className="text-destructive">{error}</p></AppLayout>;
  if (!property) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{property.name}</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/properties/${id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="min-h-[44px]"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <Row label="Localização" value={property.location} />
          <Row label="Município" value={`${property.municipality} — ${property.state}`} />
          <Row label="CEP" value={property.zip_code} />
          <Row label="Área total" value={`${Number(property.total_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Área própria" value={`${Number(property.own_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Área arrendada" value={`${Number(property.leased_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Área protegida" value={`${Number(property.protected_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Área de produção vegetal" value={`${Number(property.crop_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Pessoas na produção" value={String(property.people_count)} />
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2 border-b">
      <span className="font-medium w-48 shrink-0">{label}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Implementar PropertyEdit.tsx**

```typescript
// frontend/src/pages/PropertyEdit.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import PropertyForm, { type PropertyFormData } from "../components/PropertyForm";
import { api } from "../lib/api";
import type { Property } from "../types";

export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Property>(`/properties/${id}`)
      .then(setProperty)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function onSubmit(data: PropertyFormData) {
    setError(null);
    try {
      await api.put<Property>(`/properties/${id}`, data);
      navigate(`/properties/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  if (isLoading) return <AppLayout><p>Carregando...</p></AppLayout>;
  if (!property) return <AppLayout><p className="text-destructive">{error}</p></AppLayout>;

  const defaultValues: Partial<PropertyFormData> = {
    name: property.name,
    location: property.location,
    municipality: property.municipality,
    state: property.state,
    zip_code: property.zip_code,
    total_area_ha: Number(property.total_area_ha),
    own_area_ha: Number(property.own_area_ha),
    leased_area_ha: Number(property.leased_area_ha),
    protected_area_ha: Number(property.protected_area_ha),
    people_count: property.people_count,
    crop_area_ha: Number(property.crop_area_ha),
  };

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6">Editar: {property.name}</h1>
        {error && <p className="text-destructive mb-4">{error}</p>}
        <PropertyForm defaultValues={defaultValues} onSubmit={onSubmit} submitLabel="Salvar alterações" />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 4: Rodar build final**

```bash
cd frontend
npm run build
```

Esperado: build sem erros.

- [ ] **Step 5: Commit final da Fase 1**

```bash
git add frontend/src/pages/PropertyNew.tsx frontend/src/pages/PropertyDetail.tsx frontend/src/pages/PropertyEdit.tsx
git commit -m "feat: implement Property pages (new, detail, edit) — Phase 1 complete"
```

---

## Verificação Final

Após completar todos os tasks, verificar os critérios de sucesso da Fase 1:

- [ ] `docker compose up -d && cd backend && alembic upgrade head` — banco pronto
- [ ] `cd backend && uvicorn main:app --reload` — API rodando em http://localhost:8000
- [ ] `cd frontend && npm run dev` — app rodando em http://localhost:5173
- [ ] Acessar `/register` — criar conta
- [ ] Fazer login imediatamente após o registro
- [ ] Atualizar o navegador — sessão persiste
- [ ] Clicar em "Sair" — logout funciona
- [ ] Criar, visualizar, editar e excluir uma propriedade
- [ ] Tentar acessar `/dashboard` sem login — redireciona para `/login`
- [ ] `cd backend && python -m pytest -v` — todos os testes passam
