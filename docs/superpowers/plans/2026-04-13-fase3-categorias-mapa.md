# Phase 3: Categories + Colored Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow producers to create named color-coded categories per property and assign them to internal map areas, with areas visually colored by their category.

**Architecture:** New `categories` CRUD module under `/api/properties/{id}/categories/`. Internal areas gain a nullable `category_id` FK and a PATCH endpoint for assignment. GET `/areas/` now returns `category_id` and `category_color` per feature. Frontend adds `useCategories` hook, `CategoryManager` section below the map, `CategoryModal` for create/edit, and an updated `PropertyMap` that applies category colors and opens a Leaflet popup on click to assign/remove a category.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, GeoAlchemy2, PostgreSQL + PostGIS, Alembic, React 19, Leaflet (imperative API), TypeScript 5, Vitest + Testing Library

---

## File Map

**New backend files:**
- `backend/alembic/versions/e3f2a1b4c5d6_add_categories.py` — migration: categories table + areas.category_id
- `backend/app/categories/__init__.py`
- `backend/app/categories/models.py` — Category SQLAlchemy model
- `backend/app/categories/schemas.py` — Pydantic schemas + VALID_COLORS palette
- `backend/app/categories/service.py` — create, list, get, update, delete
- `backend/app/categories/router.py` — CRUD endpoints at `/api/properties/{id}/categories/`
- `backend/tests/test_categories.py` — 9 test cases

**Modified backend files:**
- `backend/app/areas/models.py` — add `category_id` nullable FK → categories
- `backend/app/areas/schemas.py` — add `AreaAssignRequest`
- `backend/app/areas/service.py` — `_area_to_feature` adds category fields; new `assign_category`
- `backend/app/areas/router.py` — add `PATCH /{area_id}` endpoint
- `backend/main.py` — register categories router
- `backend/tests/conftest.py` — import categories model so table is created

**New frontend files:**
- `frontend/src/hooks/useCategories.tsx`
- `frontend/src/components/CategoryModal.tsx`
- `frontend/src/components/CategoryManager.tsx`

**Modified frontend files:**
- `frontend/src/types/index.ts` — add `Category`; update `AreaProperties`
- `frontend/src/lib/api.ts` — add `patch` method
- `frontend/src/components/PropertyMap.tsx` — category colors + Leaflet popup
- `frontend/src/pages/PropertyDetail.tsx` — `useCategories`, `CategoryManager`, updated props
- `frontend/src/tests/PropertyMap.test.tsx` — new tests for category color rendering

---

## Task 1: Alembic migration — categories table + areas.category_id

**Files:**
- Create: `backend/alembic/versions/e3f2a1b4c5d6_add_categories.py`

- [ ] **Step 1: Write the migration file**

```python
# backend/alembic/versions/e3f2a1b4c5d6_add_categories.py
"""add categories table and area category_id

Revision ID: e3f2a1b4c5d6
Revises: 1493a0f2e111
Create Date: 2026-04-13 16:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e3f2a1b4c5d6"
down_revision: Union[str, None] = "1493a0f2e111"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("description", sa.String(length=300), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_categories_property_id"), "categories", ["property_id"], unique=False
    )
    op.add_column("areas", sa.Column("category_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_areas_category_id",
        "areas",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_areas_category_id", "areas", type_="foreignkey")
    op.drop_column("areas", "category_id")
    op.drop_index(op.f("ix_categories_property_id"), table_name="categories")
    op.drop_table("categories")
```

- [ ] **Step 2: Apply the migration**

Run from `backend/` (with `.venv` activated):
```bash
alembic upgrade head
```
Expected: `Running upgrade 1493a0f2e111 -> e3f2a1b4c5d6, add categories table and area category_id`

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/e3f2a1b4c5d6_add_categories.py
git commit -m "feat: migration — categories table + areas.category_id"
```

---

## Task 2: Category model + schemas

**Files:**
- Create: `backend/app/categories/__init__.py`
- Create: `backend/app/categories/models.py`
- Create: `backend/app/categories/schemas.py`

- [ ] **Step 1: Write the failing test (schema validation)**

In `backend/tests/test_categories.py`, write just the first two test cases and run them to confirm they fail (module doesn't exist yet):

```python
# backend/tests/test_categories.py
import pytest
from pydantic import ValidationError

def test_category_create_rejects_invalid_color():
    from app.categories.schemas import CategoryCreate
    with pytest.raises(ValidationError):
        CategoryCreate(name="Plantio", color="#000000")

def test_category_create_accepts_valid_color():
    from app.categories.schemas import CategoryCreate
    cat = CategoryCreate(name="Plantio", color="#ef4444")
    assert cat.color == "#ef4444"
    assert cat.description is None
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && .venv/Scripts/python -m pytest tests/test_categories.py::test_category_create_rejects_invalid_color -v
```
Expected: `ERROR` — `ModuleNotFoundError: No module named 'app.categories'`

- [ ] **Step 3: Create `__init__.py`**

```python
# backend/app/categories/__init__.py
```
(empty file)

- [ ] **Step 4: Write `models.py`**

```python
# backend/app/categories/models.py
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(7))
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 5: Write `schemas.py`**

```python
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
```

- [ ] **Step 6: Run schema tests to confirm they pass**

```bash
cd backend && .venv/Scripts/python -m pytest tests/test_categories.py::test_category_create_rejects_invalid_color tests/test_categories.py::test_category_create_accepts_valid_color -v
```
Expected: `2 passed`

- [ ] **Step 7: Commit**

```bash
git add backend/app/categories/
git commit -m "feat: Category model and Pydantic schemas"
```

---

## Task 3: Category service

**Files:**
- Create: `backend/app/categories/service.py`

- [ ] **Step 1: Write the service**

```python
# backend/app/categories/service.py
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.categories.models import Category
from app.categories.schemas import CategoryCreate, CategoryUpdate


def create_category(
    db: Session, property_id: uuid.UUID, data: CategoryCreate
) -> Category:
    cat = Category(
        id=uuid.uuid4(),
        property_id=property_id,
        name=data.name,
        color=data.color,
        description=data.description,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def list_categories(db: Session, property_id: uuid.UUID) -> list[Category]:
    return db.query(Category).filter(Category.property_id == property_id).all()


def get_category(
    db: Session, cat_id: uuid.UUID, property_id: uuid.UUID
) -> Category | None:
    return (
        db.query(Category)
        .filter(Category.id == cat_id, Category.property_id == property_id)
        .first()
    )


def update_category(db: Session, cat: Category, data: CategoryUpdate) -> Category:
    if data.name is not None:
        cat.name = data.name
    if data.color is not None:
        cat.color = data.color
    if data.description is not None:
        cat.description = data.description
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, cat: Category) -> None:
    db.delete(cat)
    db.commit()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/categories/service.py
git commit -m "feat: Category CRUD service"
```

---

## Task 4: Category router + main.py registration + conftest update

**Files:**
- Create: `backend/app/categories/router.py`
- Modify: `backend/main.py`
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: Write `router.py`**

```python
# backend/app/categories/router.py
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.models import User
from app.categories import service
from app.categories.schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from app.core.database import get_db
from app.core.deps import get_current_user
from app.properties import service as property_service

router = APIRouter(
    prefix="/api/properties/{property_id}/categories",
    tags=["categories"],
)


def _get_property_or_403(property_id: uuid.UUID, db: Session, current_user: User):
    prop = property_service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=403, detail="Forbidden")
    return prop


@router.post("/", response_model=CategoryResponse, status_code=201)
def create_category(
    property_id: uuid.UUID,
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    return service.create_category(db, property_id, data)


@router.get("/", response_model=list[CategoryResponse])
def list_categories(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    return service.list_categories(db, property_id)


@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(
    property_id: uuid.UUID,
    cat_id: uuid.UUID,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    cat = service.get_category(db, cat_id, property_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return service.update_category(db, cat, data)


@router.delete("/{cat_id}", status_code=204)
def delete_category(
    property_id: uuid.UUID,
    cat_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    cat = service.get_category(db, cat_id, property_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    service.delete_category(db, cat)
```

- [ ] **Step 2: Register the router in `main.py`**

Add after the `areas_router` import and include:

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.properties.router import router as properties_router
from app.areas.router import router as areas_router
from app.categories.router import router as categories_router

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
app.include_router(areas_router)
app.include_router(categories_router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Add categories model import to conftest**

In `backend/tests/conftest.py`, add after the existing model imports inside the `client` fixture:

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db

TEST_DB_URL = settings.DATABASE_URL.rsplit("/geomap", 1)[0] + "/geomap_test"

test_engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

with test_engine.connect() as _conn:
    _conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    _conn.commit()


@pytest.fixture(scope="function")
def client():
    import app.auth.models  # noqa: F401
    import app.properties.models  # noqa: F401
    import app.areas.models  # noqa: F401
    import app.categories.models  # noqa: F401

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

- [ ] **Step 4: Smoke test — categories endpoint responds**

```bash
cd backend && .venv/Scripts/python -m pytest tests/test_categories.py::test_category_create_rejects_invalid_color -v
```
Expected: `1 passed` (schema tests still pass; router is wired but untested via HTTP yet)

- [ ] **Step 5: Commit**

```bash
git add backend/app/categories/router.py backend/main.py backend/tests/conftest.py
git commit -m "feat: Category router registered; conftest imports categories model"
```

---

## Task 5: Area model + service + router updates

**Files:**
- Modify: `backend/app/areas/models.py`
- Modify: `backend/app/areas/schemas.py`
- Modify: `backend/app/areas/service.py`
- Modify: `backend/app/areas/router.py`

- [ ] **Step 1: Add `category_id` FK to Area model**

Replace the full content of `backend/app/areas/models.py`:

```python
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
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 2: Add `AreaAssignRequest` to `schemas.py`**

Replace the full content of `backend/app/areas/schemas.py`:

```python
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
```

- [ ] **Step 3: Update `_area_to_feature` and add `assign_category` in `service.py`**

Replace the full content of `backend/app/areas/service.py`:

```python
# backend/app/areas/service.py
import json
import uuid

from fastapi import HTTPException, UploadFile
from geoalchemy2.shape import from_shape
from shapely.geometry import shape as shapely_shape
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.areas.models import Area
from app.areas.schemas import AreaFeature, AreaListResponse


def _area_to_feature(db: Session, area: Area) -> AreaFeature:
    from app.categories.models import Category  # local import avoids circular dep

    geojson_str = db.scalar(func.ST_AsGeoJSON(area.geometry))
    category_color = None
    if area.category_id:
        cat = db.get(Category, area.category_id)
        category_color = cat.color if cat else None
    return AreaFeature(
        geometry=json.loads(geojson_str),
        properties={
            "id": str(area.id),
            "type": area.type,
            "category_id": str(area.category_id) if area.category_id else None,
            "category_color": category_color,
        },
    )


def list_areas(db: Session, property_id: uuid.UUID) -> AreaListResponse:
    areas = db.query(Area).filter(Area.property_id == property_id).all()
    boundary = None
    internal = []
    for area in areas:
        feature = _area_to_feature(db, area)
        if area.type == "boundary":
            boundary = feature
        else:
            internal.append(feature)
    return AreaListResponse(boundary=boundary, internal=internal)


async def upload_area(
    db: Session,
    property_id: uuid.UUID,
    area_type: str,
    file: UploadFile,
) -> Area:
    if area_type not in ("boundary", "internal"):
        raise HTTPException(status_code=400, detail="type must be 'boundary' or 'internal'")

    try:
        content = await file.read()
        geojson = json.loads(content)
    except (json.JSONDecodeError, Exception):
        raise HTTPException(status_code=400, detail="Invalid GeoJSON file")

    if geojson.get("type") != "Feature":
        raise HTTPException(status_code=400, detail="GeoJSON must be a Feature")
    geometry = geojson.get("geometry", {})
    if geometry.get("type") not in ("Polygon", "MultiPolygon"):
        raise HTTPException(
            status_code=400, detail="Geometry must be Polygon or MultiPolygon"
        )

    try:
        geom = shapely_shape(geometry)
        if not geom.is_valid:
            raise HTTPException(status_code=400, detail="Invalid geometry")
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Invalid geometry")

    if area_type == "boundary":
        db.query(Area).filter(
            Area.property_id == property_id, Area.type == "boundary"
        ).delete()

    area = Area(
        id=uuid.uuid4(),
        property_id=property_id,
        type=area_type,
        geometry=from_shape(geom, srid=4326),
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


def assign_category(
    db: Session,
    area: Area,
    category_id: uuid.UUID | None,
    property_id: uuid.UUID,
) -> Area:
    if category_id is not None:
        from app.categories.models import Category

        cat = (
            db.query(Category)
            .filter(Category.id == category_id, Category.property_id == property_id)
            .first()
        )
        if not cat:
            raise HTTPException(
                status_code=400,
                detail="Category does not belong to this property",
            )
    area.category_id = category_id
    db.commit()
    db.refresh(area)
    return area


def delete_area(db: Session, area: Area) -> None:
    db.delete(area)
    db.commit()


def get_area(db: Session, area_id: uuid.UUID, property_id: uuid.UUID) -> Area | None:
    return (
        db.query(Area)
        .filter(Area.id == area_id, Area.property_id == property_id)
        .first()
    )
```

- [ ] **Step 4: Add PATCH endpoint to `router.py`**

Replace the full content of `backend/app/areas/router.py`:

```python
# backend/app/areas/router.py
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, status
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.database import get_db
from app.core.deps import get_current_user
from app.areas import service
from app.areas.schemas import AreaAssignRequest, AreaListResponse
from app.properties import service as property_service

router = APIRouter(prefix="/api/properties/{property_id}/areas", tags=["areas"])


def _get_property_or_403(property_id: uuid.UUID, db: Session, current_user: User):
    prop = property_service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=403, detail="Forbidden")
    return prop


@router.get("/", response_model=AreaListResponse)
def list_areas(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    return service.list_areas(db, property_id)


@router.post("/", status_code=201)
async def upload_area(
    property_id: uuid.UUID,
    type: str = Form(...),
    file: UploadFile = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    area = await service.upload_area(db, property_id, type, file)
    return {"id": str(area.id), "type": area.type, "property_id": str(area.property_id)}


@router.patch("/{area_id}")
def assign_category(
    property_id: uuid.UUID,
    area_id: uuid.UUID,
    data: AreaAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    area = service.get_area(db, area_id, property_id)
    if not area:
        raise HTTPException(status_code=404, detail="Área não encontrada")
    service.assign_category(db, area, data.category_id, property_id)
    return {
        "id": str(area.id),
        "category_id": str(area.category_id) if area.category_id else None,
    }


@router.delete("/{area_id}", status_code=204)
def delete_area(
    property_id: uuid.UUID,
    area_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    area = service.get_area(db, area_id, property_id)
    if not area:
        raise HTTPException(status_code=404, detail="Área não encontrada")
    service.delete_area(db, area)
```

- [ ] **Step 5: Run existing area tests to confirm they still pass**

```bash
cd backend && .venv/Scripts/python -m pytest tests/test_areas.py -v
```
Expected: `8 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/areas/
git commit -m "feat: area model gains category_id FK; service returns category color; PATCH assign endpoint"
```

---

## Task 6: Backend tests for categories

**Files:**
- Modify: `backend/tests/test_categories.py` (replace the two schema-only tests with the full suite)

- [ ] **Step 1: Write the full test file**

```python
# backend/tests/test_categories.py
import io
import json

import pytest
from pydantic import ValidationError

# ── Schema-level tests (no HTTP, no DB) ──────────────────────────────────────

def test_category_create_rejects_invalid_color():
    from app.categories.schemas import CategoryCreate
    with pytest.raises(ValidationError):
        CategoryCreate(name="Plantio", color="#000000")


def test_category_create_accepts_valid_color():
    from app.categories.schemas import CategoryCreate
    cat = CategoryCreate(name="Plantio", color="#ef4444")
    assert cat.color == "#ef4444"
    assert cat.description is None


# ── HTTP integration tests ────────────────────────────────────────────────────

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

INTERNAL_GEOJSON = json.dumps({
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-47.87, -21.18],
            [-47.82, -21.18],
            [-47.82, -21.13],
            [-47.87, -21.13],
            [-47.87, -21.18],
        ]],
    },
    "properties": {},
})


def _auth_header(client) -> dict:
    res = client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _create_property(client, headers) -> str:
    res = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers)
    return res.json()["id"]


def _create_category(client, headers, prop_id, name="Plantio", color="#ef4444") -> dict:
    res = client.post(
        f"/api/properties/{prop_id}/categories/",
        json={"name": name, "color": color, "description": "desc"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()


def _upload_internal(client, headers, prop_id) -> str:
    res = client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[("file", ("area.geojson", io.BytesIO(INTERNAL_GEOJSON.encode()), "application/geo+json"))],
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["id"]


def test_create_category_returns_201(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    assert cat["name"] == "Plantio"
    assert cat["color"] == "#ef4444"
    assert cat["description"] == "desc"
    assert "id" in cat
    assert cat["property_id"] == prop_id


def test_list_categories_returns_only_own(client):
    # User 1 creates category
    headers1 = _auth_header(client)
    prop_id = _create_property(client, headers1)
    _create_category(client, headers1, prop_id)

    # User 2 has their own property
    payload2 = {**REGISTER_PAYLOAD, "email": "outro@exemplo.com", "cpf": "987.654.321-00"}
    res2 = client.post("/api/auth/register", json=payload2)
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}

    # User 2 tries to list user 1's categories — should 403
    res = client.get(f"/api/properties/{prop_id}/categories/", headers=headers2)
    assert res.status_code == 403


def test_update_category(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    cat_id = cat["id"]

    res = client.put(
        f"/api/properties/{prop_id}/categories/{cat_id}",
        json={"name": "Pastagem", "color": "#22c55e"},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Pastagem"
    assert data["color"] == "#22c55e"


def test_delete_category_sets_area_category_id_to_null(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    cat_id = cat["id"]
    area_id = _upload_internal(client, headers, prop_id)

    # Assign category to area
    res = client.patch(
        f"/api/properties/{prop_id}/areas/{area_id}",
        json={"category_id": cat_id},
        headers=headers,
    )
    assert res.status_code == 200

    # Delete the category
    res = client.delete(
        f"/api/properties/{prop_id}/categories/{cat_id}", headers=headers
    )
    assert res.status_code == 204

    # Area should now have category_id null
    areas = client.get(f"/api/properties/{prop_id}/areas/", headers=headers).json()
    area_feature = areas["internal"][0]
    assert area_feature["properties"]["category_id"] is None
    assert area_feature["properties"]["category_color"] is None


def test_create_category_invalid_color_returns_400(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.post(
        f"/api/properties/{prop_id}/categories/",
        json={"name": "Plantio", "color": "#000000"},
        headers=headers,
    )
    assert res.status_code == 422  # Pydantic validator raises 422


def test_patch_area_assigns_category(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    area_id = _upload_internal(client, headers, prop_id)

    res = client.patch(
        f"/api/properties/{prop_id}/areas/{area_id}",
        json={"category_id": cat["id"]},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["category_id"] == cat["id"]

    # Confirm GET /areas/ includes category_color
    areas = client.get(f"/api/properties/{prop_id}/areas/", headers=headers).json()
    assert areas["internal"][0]["properties"]["category_color"] == "#ef4444"


def test_patch_area_remove_category(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    area_id = _upload_internal(client, headers, prop_id)

    # Assign then remove
    client.patch(
        f"/api/properties/{prop_id}/areas/{area_id}",
        json={"category_id": cat["id"]},
        headers=headers,
    )
    res = client.patch(
        f"/api/properties/{prop_id}/areas/{area_id}",
        json={"category_id": None},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["category_id"] is None


def test_patch_area_category_from_another_property_returns_400(client):
    headers = _auth_header(client)
    prop1_id = _create_property(client, headers)
    prop2_id = _create_property(
        client,
        headers,
        # Need a different property — patch PROPERTY_PAYLOAD slightly
    )
    # create category in prop2
    cat = _create_category(client, headers, prop2_id, color="#3b82f6")
    area_id = _upload_internal(client, headers, prop1_id)

    res = client.patch(
        f"/api/properties/{prop1_id}/areas/{area_id}",
        json={"category_id": cat["id"]},
        headers=headers,
    )
    assert res.status_code == 400
    assert "does not belong" in res.json()["detail"]
```

> **Note:** `_create_property` is called twice above for two different properties. They can have the same payload since property names don't need to be unique. Just call `_create_property(client, headers)` twice.

- [ ] **Step 2: Run all category tests**

```bash
cd backend && .venv/Scripts/python -m pytest tests/test_categories.py -v
```
Expected: `11 passed` (2 schema + 9 HTTP tests)

- [ ] **Step 3: Run full backend suite**

```bash
cd backend && .venv/Scripts/python -m pytest tests/ -v
```
Expected: `19 passed` (8 area tests + 11 category tests)

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_categories.py
git commit -m "test: category CRUD + area assignment backend tests"
```

---

## Task 7: Frontend types + `api.patch`

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Write the failing test**

Create a temporary test in `frontend/src/lib/utils.test.ts` to verify `api.patch` exists (add after the existing tests):

```typescript
import { api } from "./api";

it("api exposes a patch method", () => {
  expect(typeof api.patch).toBe("function");
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd frontend && npx vitest run src/lib/utils.test.ts
```
Expected: `FAIL` — `expect(received).toBe(expected)` or `TypeError: api.patch is not a function`

- [ ] **Step 3: Update `types/index.ts`**

Replace the full content:

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

export interface Category {
  id: string;
  property_id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

export interface AreaProperties {
  id: string;
  type: "boundary" | "internal";
  category_id: string | null;
  category_color: string | null;
}

export interface AreaFeature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: AreaProperties;
}

export interface AreaListResponse {
  boundary: AreaFeature | null;
  internal: AreaFeature[];
}

export interface AreaUploadResponse {
  id: string;
  type: string;
  property_id: string;
}

export interface CategoryCreate {
  name: string;
  color: string;
  description?: string | null;
}

export interface CategoryUpdate {
  name?: string | null;
  color?: string | null;
  description?: string | null;
}
```

- [ ] **Step 4: Add `patch` to `api.ts`**

Replace the full content of `frontend/src/lib/api.ts`:

```typescript
// frontend/src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw new ApiError(res.status, body.detail || "Erro na requisição");
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => upload<T>(path, formData),
};

export { ApiError };
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
cd frontend && npx vitest run src/lib/utils.test.ts
```
Expected: `passed`

- [ ] **Step 6: Remove the temporary test line from `utils.test.ts`**

Delete the two lines you added (`import { api }...` and the `it(...)` block) from `utils.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: add Category type, update AreaProperties, add api.patch"
```

---

## Task 8: `useCategories` hook

**Files:**
- Create: `frontend/src/hooks/useCategories.tsx`

- [ ] **Step 1: Write the hook**

```typescript
// frontend/src/hooks/useCategories.tsx
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Category, CategoryCreate, CategoryUpdate } from "../types";

export function useCategories(propertyId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Category[]>(
        `/properties/${propertyId}/categories/`
      );
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(
    async (data: CategoryCreate) => {
      const cat = await api.post<Category>(
        `/properties/${propertyId}/categories/`,
        data
      );
      await fetchCategories();
      return cat;
    },
    [propertyId, fetchCategories]
  );

  const updateCategory = useCallback(
    async (catId: string, data: CategoryUpdate) => {
      const cat = await api.put<Category>(
        `/properties/${propertyId}/categories/${catId}`,
        data
      );
      await fetchCategories();
      return cat;
    },
    [propertyId, fetchCategories]
  );

  const deleteCategory = useCallback(
    async (catId: string) => {
      await api.delete(`/properties/${propertyId}/categories/${catId}`);
      await fetchCategories();
    },
    [propertyId, fetchCategories]
  );

  const assignToArea = useCallback(
    async (areaId: string, categoryId: string | null) => {
      await api.patch(`/properties/${propertyId}/areas/${areaId}`, {
        category_id: categoryId,
      });
    },
    [propertyId]
  );

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    assignToArea,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useCategories.tsx
git commit -m "feat: useCategories hook (CRUD + assignToArea)"
```

---

## Task 9: `CategoryModal` component

**Files:**
- Create: `frontend/src/components/CategoryModal.tsx`

The palette constant matches the backend `VALID_COLORS`.

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/CategoryModal.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategoryCreate, CategoryUpdate } from "../types";

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#f43f5e", "#84cc16", "#06b6d4",
];

interface CategoryModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: { name: string; color: string; description: string | null };
  onSave: (data: CategoryCreate | CategoryUpdate) => Promise<void>;
  onClose: () => void;
}

export default function CategoryModal({
  open,
  mode,
  initialValues,
  onSave,
  onClose,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setColor(initialValues?.color ?? PALETTE[0]);
      setDescription(initialValues?.description ?? "");
      setError(null);
    }
  }, [open, initialValues]);

  if (!open) return null;

  async function handleSave() {
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), color, description: description.trim() || null });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold mb-4">
          {mode === "create" ? "Nova categoria" : "Editar categoria"}
        </h2>

        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Nome *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Plantio de soja"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium block mb-2">Cor</label>
          <div className="grid grid-cols-6 gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-8 h-8 rounded-full transition-transform hover:scale-110",
                  color === c && "ring-2 ring-offset-2 ring-white scale-110"
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Área destinada ao cultivo de soja"
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/CategoryModal.tsx
git commit -m "feat: CategoryModal component (create/edit, 12-color palette)"
```

---

## Task 10: `CategoryManager` component

**Files:**
- Create: `frontend/src/components/CategoryManager.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/CategoryManager.tsx
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategoryModal from "./CategoryModal";
import type { Category, CategoryCreate, CategoryUpdate } from "../types";

interface CategoryManagerProps {
  categories: Category[];
  onCreateCategory: (data: CategoryCreate) => Promise<void>;
  onUpdateCategory: (id: string, data: CategoryUpdate) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function CategoryManager({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  function openCreate() {
    setEditingCategory(null);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setModalOpen(true);
  }

  async function handleSave(data: CategoryCreate | CategoryUpdate) {
    if (editingCategory) {
      await onUpdateCategory(editingCategory.id, data as CategoryUpdate);
    } else {
      await onCreateCategory(data as CategoryCreate);
    }
  }

  async function handleDelete(cat: Category) {
    if (!window.confirm(`Excluir categoria "${cat.name}"? As áreas associadas voltarão para a cor padrão.`)) return;
    await onDeleteCategory(cat.id);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Categorias</h2>
        <Button size="sm" onClick={openCreate}>
          Nova categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(cat)}
                  aria-label={`Editar ${cat.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(cat)}
                  aria-label={`Excluir ${cat.name}`}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryModal
        open={modalOpen}
        mode={editingCategory ? "edit" : "create"}
        initialValues={
          editingCategory
            ? {
                name: editingCategory.name,
                color: editingCategory.color,
                description: editingCategory.description,
              }
            : undefined
        }
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/CategoryManager.tsx
git commit -m "feat: CategoryManager component (list, create, edit, delete)"
```

---

## Task 11: `PropertyMap` update — category colors + assignment popup

**Files:**
- Modify: `frontend/src/components/PropertyMap.tsx`

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/tests/PropertyMap.test.tsx` (before the final `}`):

```typescript
it("área interna sem categoria usa cor padrão (#1e40af)", () => {
  const L = (await import("leaflet")).default;
  const AREAS_WITH_INTERNAL: AreaListResponse = {
    boundary: null,
    internal: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[-47.9,-21.2],[-47.8,-21.2],[-47.8,-21.1],[-47.9,-21.1],[-47.9,-21.2]]] },
        properties: { id: "i1", type: "internal", category_id: null, category_color: null },
      },
    ],
  };
  render(<PropertyMap areas={AREAS_WITH_INTERNAL} categories={[]} onAddArea={vi.fn()} onAssignCategory={vi.fn()} />);
  const calls = (L.geoJSON as ReturnType<typeof vi.fn>).mock.calls;
  const styleArg = calls[calls.length - 1]?.[1]?.style;
  expect(styleArg?.fillColor).toBe("#1e40af");
});
```

Run it to confirm it fails (PropertyMap doesn't accept `categories`/`onAssignCategory` props yet):

```bash
cd frontend && npx vitest run src/tests/PropertyMap.test.tsx
```
Expected: TypeScript error or test failure.

- [ ] **Step 2: Write the updated `PropertyMap.tsx`**

```tsx
// frontend/src/components/PropertyMap.tsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AreaListResponse, Category } from "../types";

interface PropertyMapProps {
  areas: AreaListResponse;
  categories: Category[];
  onAddArea: () => void;
  onAssignCategory: (areaId: string, categoryId: string | null) => void;
}

function buildCategoryPopup(
  categories: Category[],
  currentCategoryId: string | null
): HTMLElement {
  const div = document.createElement("div");
  div.style.minWidth = "180px";

  const title = document.createElement("p");
  title.style.cssText = "font-size:13px;font-weight:600;margin:0 0 8px 0;color:#f1f5f9";
  title.textContent = "Atribuir categoria";
  div.appendChild(title);

  if (categories.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "font-size:12px;color:#94a3b8";
    empty.textContent = "Nenhuma categoria cadastrada";
    div.appendChild(empty);
    return div;
  }

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px";

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.dataset.catId = cat.id;
    btn.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:5px 8px;
      border-radius:4px;border:1px solid ${cat.id === currentCategoryId ? "#e2e8f0" : "#334155"};
      background:transparent;cursor:pointer;font-size:12px;color:#f1f5f9;
      text-align:left;
    `;
    const swatch = document.createElement("span");
    swatch.style.cssText = `
      width:10px;height:10px;border-radius:50%;
      background:${cat.color};flex-shrink:0;
    `;
    btn.appendChild(swatch);
    btn.appendChild(document.createTextNode(cat.name));
    grid.appendChild(btn);
  });

  div.appendChild(grid);

  if (currentCategoryId) {
    const removeBtn = document.createElement("button");
    removeBtn.dataset.remove = "true";
    removeBtn.style.cssText =
      "font-size:12px;color:#f87171;background:transparent;border:none;cursor:pointer;padding:2px 0;display:block";
    removeBtn.textContent = "Remover categoria";
    div.appendChild(removeBtn);
  }

  return div;
}

export default function PropertyMap({
  areas,
  categories,
  onAddArea,
  onAssignCategory,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onAssignCategoryRef = useRef(onAssignCategory);

  useEffect(() => {
    onAssignCategoryRef.current = onAssignCategory;
  });

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([-15, -52], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualizar camadas ao mudar áreas ou categorias
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) map.removeLayer(layer);
    });

    const bounds: L.LatLngBounds[] = [];

    if (areas.boundary) {
      const layer = L.geoJSON(areas.boundary as GeoJSON.Feature, {
        style: { color: "#4ade80", fillColor: "#2d7a4f", fillOpacity: 0.4, weight: 2 },
      }).addTo(map);
      bounds.push(layer.getBounds());
    }

    areas.internal.forEach((feature) => {
      const areaId = feature.properties.id;
      const categoryColor = feature.properties.category_color;
      const currentCategoryId = feature.properties.category_id;
      const fillColor = categoryColor ?? "#1e40af";
      const strokeColor = categoryColor ?? "#60a5fa";

      const layer = L.geoJSON(feature as GeoJSON.Feature, {
        style: { color: strokeColor, fillColor, fillOpacity: 0.4, weight: 1.5 },
      }).addTo(map);

      layer.on("click", (e: L.LeafletMouseEvent) => {
        const popupEl = buildCategoryPopup(categories, currentCategoryId);

        const popup = L.popup({ minWidth: 200 })
          .setLatLng(e.latlng)
          .setContent(popupEl);

        popup.on("add", () => {
          popupEl.querySelectorAll<HTMLButtonElement>("[data-cat-id]").forEach((btn) => {
            btn.addEventListener("click", () => {
              onAssignCategoryRef.current(areaId, btn.dataset.catId!);
              map.closePopup();
            });
          });
          const removeBtn = popupEl.querySelector<HTMLButtonElement>("[data-remove]");
          removeBtn?.addEventListener("click", () => {
            onAssignCategoryRef.current(areaId, null);
            map.closePopup();
          });
        });

        popup.openOn(map);
      });

      bounds.push(layer.getBounds());
    });

    if (bounds.length > 0) {
      const combined = bounds.reduce((acc, b) => acc.extend(b));
      map.fitBounds(combined, { padding: [20, 20] });
    }
  }, [areas, categories]);

  const isEmpty = !areas.boundary && areas.internal.length === 0;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        data-testid="map-container"
        style={{ aspectRatio: "4/3" }}
        className="w-full rounded-lg overflow-hidden border border-border"
      />
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded">
            Nenhuma área cadastrada
          </p>
        </div>
      )}
      <button
        onClick={onAddArea}
        aria-label="Adicionar área"
        className="absolute bottom-3 right-3 z-[400] w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-500 text-xl leading-none"
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/tests/PropertyMap.test.tsx
```
Expected: all existing tests + new color test pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/PropertyMap.tsx
git commit -m "feat: PropertyMap supports category colors and Leaflet popup for assignment"
```

---

## Task 12: `PropertyDetail` page update

**Files:**
- Modify: `frontend/src/pages/PropertyDetail.tsx`

- [ ] **Step 1: Write the updated page**

```tsx
// frontend/src/pages/PropertyDetail.tsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import AppLayout from "../components/AppLayout";
import PropertyMap from "../components/PropertyMap";
import AreaUploadModal from "../components/AreaUploadModal";
import CategoryManager from "../components/CategoryManager";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../lib/api";
import { useAreas } from "../hooks/useAreas";
import { useCategories } from "../hooks/useCategories";
import type { Property } from "../types";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { areas, uploadArea, refetch: refetchAreas } = useAreas(id!);
  const { categories, createCategory, updateCategory, deleteCategory, assignToArea } =
    useCategories(id!);

  useEffect(() => {
    api
      .get<Property>(`/properties/${id}`)
      .then(setProperty)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleAssignCategory = useCallback(
    async (areaId: string, categoryId: string | null) => {
      await assignToArea(areaId, categoryId);
      await refetchAreas();
    },
    [assignToArea, refetchAreas]
  );

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
            <Link
              to={`/properties/${id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
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

        <div className="space-y-4 text-sm mb-6">
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

        <PropertyMap
          areas={areas}
          categories={categories}
          onAddArea={() => setModalOpen(true)}
          onAssignCategory={handleAssignCategory}
        />

        <CategoryManager
          categories={categories}
          onCreateCategory={createCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={async (catId) => {
            await deleteCategory(catId);
            await refetchAreas();
          }}
        />

        <AreaUploadModal
          open={modalOpen}
          hasBoundary={areas.boundary !== null}
          onClose={() => setModalOpen(false)}
          onUpload={uploadArea}
        />
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PropertyDetail.tsx
git commit -m "feat: PropertyDetail wires categories — CategoryManager + map assignment"
```

---

## Task 13: Frontend tests

**Files:**
- Modify: `frontend/src/tests/PropertyMap.test.tsx`

- [ ] **Step 1: Replace the full test file with the updated suite**

```tsx
// frontend/src/tests/PropertyMap.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { AreaListResponse } from "../types";

// Mock completo do leaflet — não funciona em jsdom
// IMPORTANT: mockLayer/mockMap must be defined INSIDE the factory
// because vi.mock is hoisted before variable declarations in the module.
vi.mock("leaflet", () => {
  const mockLayer = {
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn().mockReturnValue({ extend: vi.fn().mockReturnThis() }),
    on: vi.fn(),
  };
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    eachLayer: vi.fn((_cb: (l: unknown) => void) => {}),
    fitBounds: vi.fn(),
    closePopup: vi.fn(),
  };
  return {
    default: {
      map: vi.fn().mockReturnValue(mockMap),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      geoJSON: vi.fn().mockReturnValue(mockLayer),
      GeoJSON: class {},
      popup: vi.fn().mockReturnValue({
        setLatLng: vi.fn().mockReturnThis(),
        setContent: vi.fn().mockReturnThis(),
        on: vi.fn(),
        openOn: vi.fn(),
      }),
    },
  };
});

import L from "leaflet";
import PropertyMap from "../components/PropertyMap";

const EMPTY_AREAS: AreaListResponse = { boundary: null, internal: [] };

const AREAS_WITH_BOUNDARY: AreaListResponse = {
  boundary: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[[-47.9, -21.2], [-47.8, -21.2], [-47.8, -21.1], [-47.9, -21.1], [-47.9, -21.2]]],
    },
    properties: { id: "b1", type: "boundary", category_id: null, category_color: null },
  },
  internal: [],
};

const AREAS_WITH_INTERNAL: AreaListResponse = {
  boundary: null,
  internal: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[-47.9, -21.2], [-47.8, -21.2], [-47.8, -21.1], [-47.9, -21.1], [-47.9, -21.2]]],
      },
      properties: { id: "i1", type: "internal", category_id: null, category_color: null },
    },
  ],
};

const AREAS_WITH_CATEGORY: AreaListResponse = {
  boundary: null,
  internal: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[-47.9, -21.2], [-47.8, -21.2], [-47.8, -21.1], [-47.9, -21.1], [-47.9, -21.2]]],
      },
      properties: { id: "i2", type: "internal", category_id: "cat-1", category_color: "#ef4444" },
    },
  ],
};

describe("PropertyMap", () => {
  const onAddArea = vi.fn();
  const onAssignCategory = vi.fn();

  beforeEach(() => {
    onAddArea.mockClear();
    onAssignCategory.mockClear();
    (L.geoJSON as ReturnType<typeof vi.fn>).mockClear();
  });

  it("renderiza o container do mapa", () => {
    render(<PropertyMap areas={EMPTY_AREAS} categories={[]} onAddArea={onAddArea} onAssignCategory={onAssignCategory} />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("exibe placeholder quando não há áreas", () => {
    render(<PropertyMap areas={EMPTY_AREAS} categories={[]} onAddArea={onAddArea} onAssignCategory={onAssignCategory} />);
    expect(screen.getByText("Nenhuma área cadastrada")).toBeInTheDocument();
  });

  it("não exibe placeholder quando há áreas", () => {
    render(<PropertyMap areas={AREAS_WITH_BOUNDARY} categories={[]} onAddArea={onAddArea} onAssignCategory={onAssignCategory} />);
    expect(screen.queryByText("Nenhuma área cadastrada")).not.toBeInTheDocument();
  });

  it("chama onAddArea ao clicar no botão +", () => {
    render(<PropertyMap areas={EMPTY_AREAS} categories={[]} onAddArea={onAddArea} onAssignCategory={onAssignCategory} />);
    fireEvent.click(screen.getByLabelText("Adicionar área"));
    expect(onAddArea).toHaveBeenCalledTimes(1);
  });

  it("área interna sem categoria usa cor padrão (#60a5fa stroke, #1e40af fill)", () => {
    render(<PropertyMap areas={AREAS_WITH_INTERNAL} categories={[]} onAddArea={onAddArea} onAssignCategory={onAssignCategory} />);
    const calls = (L.geoJSON as ReturnType<typeof vi.fn>).mock.calls;
    // The internal area is the last (and only) geoJSON call for AREAS_WITH_INTERNAL
    const styleArg = calls[calls.length - 1]?.[1]?.style;
    expect(styleArg?.color).toBe("#60a5fa");
    expect(styleArg?.fillColor).toBe("#1e40af");
  });

  it("área interna com category_color usa a cor da categoria para stroke e fill", () => {
    render(<PropertyMap areas={AREAS_WITH_CATEGORY} categories={[]} onAddArea={onAddArea} onAssignCategory={onAssignCategory} />);
    const calls = (L.geoJSON as ReturnType<typeof vi.fn>).mock.calls;
    const styleArg = calls[calls.length - 1]?.[1]?.style;
    expect(styleArg?.color).toBe("#ef4444");
    expect(styleArg?.fillColor).toBe("#ef4444");
  });
});
```

- [ ] **Step 2: Run frontend tests**

```bash
cd frontend && npx vitest run src/tests/PropertyMap.test.tsx
```
Expected: `6 passed`

- [ ] **Step 3: Run full frontend test suite**

```bash
cd frontend && npx vitest run
```
Expected: all tests pass (6 PropertyMap + any other existing tests)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/tests/PropertyMap.test.tsx
git commit -m "test: update PropertyMap tests for category colors and new props"
```

---

## Final verification

- [ ] **Start backend and confirm categories API responds**

```bash
cd backend && .venv/Scripts/uvicorn main:app --reload
```
Visit `http://localhost:8000/docs` — confirm `/api/properties/{property_id}/categories/` endpoints appear.

- [ ] **Start frontend and smoke-test**

```bash
cd frontend && npm run dev
```
Open a property detail page → confirm:
1. Map shows (no JS errors in console)
2. "Categorias" section appears below the map with "Nenhuma categoria cadastrada"
3. Clicking "Nova categoria" opens the modal with color palette
4. Creating a category shows it in the list
5. Uploading an internal area and clicking it on the map opens the Leaflet popup with the category
6. Selecting a category colors the area
7. Deleting a category returns the area to default blue

- [ ] **Run full backend test suite one last time**

```bash
cd backend && .venv/Scripts/python -m pytest tests/ -v
```
Expected: `19 passed`
