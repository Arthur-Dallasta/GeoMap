# Fase 2 — Importação GeoJSON + Mapa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produtores podem fazer upload de arquivos GeoJSON para suas propriedades e visualizar as geometrias num mapa Leaflet embutido na página de detalhe.

**Architecture:** Novo módulo `app/areas/` no backend (model + schemas + service + router) montado em `/api/properties/{id}/areas/`. Geometrias persistidas no PostGIS via GeoAlchemy2. Frontend usa Leaflet puro (imperativo) com hook `useAreas`, componente `PropertyMap` e modal `AreaUploadModal` injetados no `PropertyDetail` existente.

**Tech Stack:** Python/FastAPI, GeoAlchemy2 0.15.2, Shapely 2.x, PostgreSQL/PostGIS, React 19, TypeScript, Leaflet 1.9.x, Vitest/Testing Library

---

## File Map

**Backend — criar:**
- `backend/app/areas/__init__.py`
- `backend/app/areas/models.py` — model `Area` com GeoAlchemy2
- `backend/app/areas/schemas.py` — `AreaResponse`, `AreaListResponse`
- `backend/app/areas/service.py` — upload, list, delete
- `backend/app/areas/router.py` — endpoints montados em `/api/properties/{id}/areas`
- `backend/alembic/versions/<hash>_add_areas_table.py` — migration PostGIS + areas

**Backend — modificar:**
- `backend/requirements.txt` — adicionar `shapely>=2.0`
- `backend/main.py` — registrar `areas_router`
- `backend/alembic/env.py` — importar `app.areas.models`
- `backend/tests/conftest.py` — importar `app.areas.models` + habilitar PostGIS em geomap_test
- `backend/tests/test_areas.py` — criar com todos os testes

**Frontend — criar:**
- `frontend/src/hooks/useAreas.tsx`
- `frontend/src/components/PropertyMap.tsx`
- `frontend/src/components/AreaUploadModal.tsx`
- `frontend/src/tests/PropertyMap.test.tsx`

**Frontend — modificar:**
- `frontend/src/types/index.ts` — adicionar `Area`, `AreaListResponse`
- `frontend/src/lib/api.ts` — adicionar método `upload` + `getAreas`, `uploadArea`, `deleteArea`
- `frontend/src/pages/PropertyDetail.tsx` — injetar `PropertyMap` + `AreaUploadModal`

---

## Task 1: Dependência Shapely + PostGIS no banco de testes + modelo Area

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/app/areas/__init__.py`
- Create: `backend/app/areas/models.py`

- [ ] **Step 1: Adicionar shapely ao requirements.txt**

Abrir `backend/requirements.txt` e adicionar logo abaixo da linha do geoalchemy2:
```
shapely>=2.0
```

O arquivo deve ficar assim nas linhas relevantes:
```
geoalchemy2==0.15.2
shapely>=2.0
psycopg2-binary==2.9.11
```

- [ ] **Step 2: Instalar shapely no virtualenv**

```bash
cd GeoMap/backend
.venv/Scripts/pip install shapely>=2.0
```

Expected: `Successfully installed shapely-2.x.x`

- [ ] **Step 3: Habilitar PostGIS no banco geomap_test**

```bash
cd GeoMap/backend
PYTHONPATH=. .venv/Scripts/python -c "
from sqlalchemy import create_engine, text
from app.core.config import settings
test_url = settings.DATABASE_URL.rsplit('/geomap', 1)[0] + '/geomap_test'
engine = create_engine(test_url)
with engine.connect() as conn:
    conn.execute(text('CREATE EXTENSION IF NOT EXISTS postgis'))
    conn.commit()
print('PostGIS enabled in geomap_test')
"
```

Expected: `PostGIS enabled in geomap_test`

- [ ] **Step 4: Criar `backend/app/areas/__init__.py`**

```python
```

(arquivo vazio)

- [ ] **Step 5: Criar `backend/app/areas/models.py`**

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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 6: Commit**

```bash
cd GeoMap
git add backend/requirements.txt backend/app/areas/
git commit -m "feat: add Area model and shapely dependency"
```

---

## Task 2: Migration Alembic — tabela areas

**Files:**
- Modify: `backend/alembic/env.py`
- Create: `backend/alembic/versions/<hash>_add_areas_table.py`

- [ ] **Step 1: Atualizar `backend/alembic/env.py` para importar o modelo Area**

Adicionar a linha após o import de `app.properties.models`:
```python
import app.areas.models  # noqa: F401
```

O arquivo completo deve ficar:
```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.core.database import Base
import app.auth.models  # noqa: F401 — registers User in metadata
import app.properties.models  # noqa: F401
import app.areas.models  # noqa: F401

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
        config.get_section(config.config_ini_section, {}),
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

- [ ] **Step 2: Gerar a migration**

```bash
cd GeoMap/backend
PYTHONPATH=. .venv/Scripts/python -m alembic revision --autogenerate -m "add areas table"
```

Expected: `Generating .../versions/<hash>_add_areas_table.py ...  done`

- [ ] **Step 3: Verificar e corrigir a migration gerada**

Abrir o arquivo gerado em `backend/alembic/versions/<hash>_add_areas_table.py` e verificar que o conteúdo do `upgrade()` inclui `CREATE EXTENSION` e a tabela `areas`. Se o autogenerate não incluiu o `CREATE EXTENSION`, reescrever o arquivo manualmente:

```python
"""add areas table

Revision ID: <hash_gerado>
Revises: 7064f49ca872
Create Date: 2026-04-13 ...

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


revision: str = '<hash_gerado>'
down_revision: Union[str, None] = '7064f49ca872'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        'areas',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('property_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(length=10), nullable=False),
        sa.Column(
            'geometry',
            Geometry(geometry_type='GEOMETRY', srid=4326),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_areas_property_id'), 'areas', ['property_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_areas_property_id'), table_name='areas')
    op.drop_table('areas')
```

- [ ] **Step 4: Aplicar a migration no banco principal**

```bash
cd GeoMap/backend
PYTHONPATH=. .venv/Scripts/python -m alembic upgrade head
```

Expected: `Running upgrade 7064f49ca872 -> <hash>, add areas table`

- [ ] **Step 5: Commit**

```bash
cd GeoMap
git add backend/alembic/
git commit -m "feat: migration — add areas table with PostGIS geometry"
```

---

## Task 3: Area schemas

**Files:**
- Create: `backend/app/areas/schemas.py`

- [ ] **Step 1: Criar `backend/app/areas/schemas.py`**

```python
# backend/app/areas/schemas.py
import uuid
from typing import Any

from pydantic import BaseModel


class AreaResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    type: str
    geometry: dict[str, Any]  # GeoJSON geometry object

    model_config = {"from_attributes": True}


class AreaFeature(BaseModel):
    """GeoJSON Feature wrapping an Area."""
    type: str = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any]


class AreaListResponse(BaseModel):
    boundary: AreaFeature | None
    internal: list[AreaFeature]
```

- [ ] **Step 2: Commit**

```bash
cd GeoMap
git add backend/app/areas/schemas.py
git commit -m "feat: area schemas (AreaResponse, AreaListResponse)"
```

---

## Task 4: Testes do backend (TDD — escrita dos testes antes do service)

**Files:**
- Modify: `backend/tests/conftest.py`
- Create: `backend/tests/test_areas.py`

- [ ] **Step 1: Atualizar `backend/tests/conftest.py`**

Adicionar o import de `app.areas.models` e habilitar PostGIS no banco de testes no nível de módulo. O arquivo completo:

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db

# Banco de dados de teste separado
TEST_DB_URL = settings.DATABASE_URL.rsplit("/geomap", 1)[0] + "/geomap_test"

test_engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Habilitar PostGIS no banco de testes (idempotente)
with test_engine.connect() as _conn:
    _conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    _conn.commit()


@pytest.fixture(scope="function")
def client():
    import app.auth.models  # noqa: F401
    import app.properties.models  # noqa: F401
    import app.areas.models  # noqa: F401

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

- [ ] **Step 2: Criar `backend/tests/test_areas.py` com todos os testes**

```python
# backend/tests/test_areas.py
import io
import json

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

BOUNDARY_GEOJSON = json.dumps({
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-47.9, -21.2],
            [-47.8, -21.2],
            [-47.8, -21.1],
            [-47.9, -21.1],
            [-47.9, -21.2],
        ]]
    },
    "properties": {}
})

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
        ]]
    },
    "properties": {}
})

INVALID_GEOJSON = '{"type": "Feature", "geometry": {"type": "Point", "coordinates": [0, 0]}, "properties": {}}'


def _auth_header(client) -> dict:
    res = client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_property(client, headers) -> str:
    res = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers)
    return res.json()["id"]


def _make_file(content: str, filename: str = "area.geojson"):
    return ("file", (filename, io.BytesIO(content.encode()), "application/geo+json"))


def test_upload_boundary_creates_area(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "boundary"},
        files=[_make_file(BOUNDARY_GEOJSON)],
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "boundary"
    assert "id" in data


def test_upload_second_boundary_replaces_first(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)

    # Upload primeiro boundary
    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "boundary"},
        files=[_make_file(BOUNDARY_GEOJSON)],
        headers=headers,
    )
    first_id = client.get(
        f"/api/properties/{prop_id}/areas/", headers=headers
    ).json()["boundary"]["properties"]["id"]

    # Upload segundo boundary
    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "boundary"},
        files=[_make_file(BOUNDARY_GEOJSON)],
        headers=headers,
    )
    second_id = client.get(
        f"/api/properties/{prop_id}/areas/", headers=headers
    ).json()["boundary"]["properties"]["id"]

    assert first_id != second_id


def test_upload_internal_accumulates(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)

    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[_make_file(INTERNAL_GEOJSON)],
        headers=headers,
    )
    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[_make_file(INTERNAL_GEOJSON)],
        headers=headers,
    )

    res = client.get(f"/api/properties/{prop_id}/areas/", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["internal"]) == 2


def test_get_areas_returns_null_boundary_when_none(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.get(f"/api/properties/{prop_id}/areas/", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["boundary"] is None
    assert data["internal"] == []


def test_upload_invalid_geometry_type_returns_400(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[_make_file(INVALID_GEOJSON)],
        headers=headers,
    )
    assert res.status_code == 400
    assert "Polygon" in res.json()["detail"]


def test_upload_invalid_json_returns_400(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[_make_file("not valid json")],
        headers=headers,
    )
    assert res.status_code == 400


def test_delete_area(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "boundary"},
        files=[_make_file(BOUNDARY_GEOJSON)],
        headers=headers,
    )
    area_id = client.get(
        f"/api/properties/{prop_id}/areas/", headers=headers
    ).json()["boundary"]["properties"]["id"]

    res = client.delete(f"/api/properties/{prop_id}/areas/{area_id}", headers=headers)
    assert res.status_code == 204

    res = client.get(f"/api/properties/{prop_id}/areas/", headers=headers)
    assert res.json()["boundary"] is None


def test_areas_of_other_user_property_returns_403(client):
    # Usuário 1 cria propriedade
    headers1 = _auth_header(client)
    prop_id = _create_property(client, headers1)

    # Usuário 2 tenta acessar
    payload2 = {**REGISTER_PAYLOAD, "email": "outro@exemplo.com", "cpf": "987.654.321-00"}
    res2 = client.post("/api/auth/register", json=payload2)
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}

    res = client.get(f"/api/properties/{prop_id}/areas/", headers=headers2)
    assert res.status_code == 403
```

- [ ] **Step 3: Executar os testes para confirmar que falham (sem service ainda)**

```bash
cd GeoMap/backend
PYTHONPATH=. .venv/Scripts/python -m pytest tests/test_areas.py -v
```

Expected: erros de import ou 404 — testes devem FALHAR.

- [ ] **Step 4: Commit**

```bash
cd GeoMap
git add backend/tests/
git commit -m "test: área tests (failing — TDD)"
```

---

## Task 5: Area service

**Files:**
- Create: `backend/app/areas/service.py`

- [ ] **Step 1: Criar `backend/app/areas/service.py`**

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
    geojson_str = db.scalar(func.ST_AsGeoJSON(area.geometry))
    return AreaFeature(
        geometry=json.loads(geojson_str),
        properties={"id": str(area.id), "type": area.type},
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
    # Validar tipo
    if area_type not in ("boundary", "internal"):
        raise HTTPException(status_code=400, detail="type must be 'boundary' or 'internal'")

    # Ler e parsear GeoJSON
    try:
        content = await file.read()
        geojson = json.loads(content)
    except (json.JSONDecodeError, Exception):
        raise HTTPException(status_code=400, detail="Invalid GeoJSON file")

    # Validar estrutura: deve ser Feature com Polygon ou MultiPolygon
    if geojson.get("type") != "Feature":
        raise HTTPException(status_code=400, detail="GeoJSON must be a Feature")
    geometry = geojson.get("geometry", {})
    if geometry.get("type") not in ("Polygon", "MultiPolygon"):
        raise HTTPException(
            status_code=400, detail="Geometry must be Polygon or MultiPolygon"
        )

    # Validar geometria com Shapely
    try:
        geom = shapely_shape(geometry)
        if not geom.is_valid:
            raise HTTPException(status_code=400, detail="Invalid geometry")
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Invalid geometry")

    # Substituir boundary anterior se necessário
    if area_type == "boundary":
        db.query(Area).filter(
            Area.property_id == property_id, Area.type == "boundary"
        ).delete()

    # Salvar no banco
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

- [ ] **Step 2: Commit**

```bash
cd GeoMap
git add backend/app/areas/service.py
git commit -m "feat: area service (upload, list, delete)"
```

---

## Task 6: Area router + registrar em main.py + executar testes

**Files:**
- Create: `backend/app/areas/router.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Criar `backend/app/areas/router.py`**

```python
# backend/app/areas/router.py
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.database import get_db
from app.core.deps import get_current_user
from app.areas import service
from app.areas.schemas import AreaListResponse
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

- [ ] **Step 2: Registrar o router em `backend/main.py`**

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.properties.router import router as properties_router
from app.areas.router import router as areas_router

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


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Executar todos os testes para confirmar que passam**

```bash
cd GeoMap/backend
PYTHONPATH=. .venv/Scripts/python -m pytest -v
```

Expected: todos os testes passando (22+ testes).

- [ ] **Step 4: Commit**

```bash
cd GeoMap
git add backend/app/areas/router.py backend/main.py
git commit -m "feat: area router — POST/GET/DELETE /api/properties/{id}/areas/"
```

---

## Task 7: Frontend — instalar dependências + tipos + método upload na api

**Files:**
- Modify: `frontend/package.json` (via npm)
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Instalar leaflet e @types/leaflet**

```bash
cd GeoMap/frontend
npm install leaflet@^1.9.4
npm install --save-dev @types/leaflet@^1.9.14
```

Expected: `added N packages`

- [ ] **Step 2: Adicionar tipos de Area em `frontend/src/types/index.ts`**

Adicionar ao final do arquivo (mantendo os tipos existentes):

```typescript
export interface AreaProperties {
  id: string;
  type: "boundary" | "internal";
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
```

- [ ] **Step 3: Adicionar método `upload` e funções de área em `frontend/src/lib/api.ts`**

Substituir o arquivo completo:

```typescript
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
  // Sem Content-Type — browser define automaticamente com o boundary do multipart
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
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => upload<T>(path, formData),
};

export { ApiError };
```

- [ ] **Step 4: Commit**

```bash
cd GeoMap
git add frontend/package.json frontend/package-lock.json frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: leaflet dep + Area types + api upload method"
```

---

## Task 8: Hook useAreas

**Files:**
- Create: `frontend/src/hooks/useAreas.tsx`

- [ ] **Step 1: Criar `frontend/src/hooks/useAreas.tsx`**

```typescript
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AreaListResponse, AreaUploadResponse } from "../types";

const EMPTY_AREAS: AreaListResponse = { boundary: null, internal: [] };

export function useAreas(propertyId: string) {
  const [areas, setAreas] = useState<AreaListResponse>(EMPTY_AREAS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AreaListResponse>(`/properties/${propertyId}/areas/`);
      setAreas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar áreas");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const uploadArea = useCallback(
    async (file: File, type: "boundary" | "internal") => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const result = await api.upload<AreaUploadResponse>(
        `/properties/${propertyId}/areas/`,
        formData,
      );
      await fetchAreas();
      return result;
    },
    [propertyId, fetchAreas],
  );

  const deleteArea = useCallback(
    async (areaId: string) => {
      await api.delete(`/properties/${propertyId}/areas/${areaId}`);
      await fetchAreas();
    },
    [propertyId, fetchAreas],
  );

  return { areas, loading, error, uploadArea, deleteArea, refetch: fetchAreas };
}
```

- [ ] **Step 2: Commit**

```bash
cd GeoMap
git add frontend/src/hooks/useAreas.tsx
git commit -m "feat: useAreas hook (fetch, upload, delete)"
```

---

## Task 9: Componente PropertyMap + testes

**Files:**
- Create: `frontend/src/components/PropertyMap.tsx`
- Create: `frontend/src/tests/PropertyMap.test.tsx`

- [ ] **Step 1: Escrever o teste antes do componente**

Criar `frontend/src/tests/PropertyMap.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { AreaListResponse } from "../types";

// Mock completo do leaflet — não funciona em jsdom
vi.mock("leaflet", () => {
  const mockLayer = {
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn().mockReturnValue({
      extend: vi.fn().mockReturnThis(),
    }),
  };
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    eachLayer: vi.fn((cb: (l: unknown) => void) => {}),
    fitBounds: vi.fn(),
  };
  return {
    default: {
      map: vi.fn().mockReturnValue(mockMap),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      geoJSON: vi.fn().mockReturnValue(mockLayer),
      GeoJSON: class {},
    },
  };
});

import PropertyMap from "../components/PropertyMap";

const EMPTY_AREAS: AreaListResponse = { boundary: null, internal: [] };

const AREAS_WITH_BOUNDARY: AreaListResponse = {
  boundary: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[[-47.9, -21.2], [-47.8, -21.2], [-47.8, -21.1], [-47.9, -21.1], [-47.9, -21.2]]],
    },
    properties: { id: "abc123", type: "boundary" },
  },
  internal: [],
};

describe("PropertyMap", () => {
  const onAddArea = vi.fn();

  beforeEach(() => {
    onAddArea.mockClear();
  });

  it("renderiza o container do mapa", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("exibe placeholder quando não há áreas", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} />);
    expect(screen.getByText("Nenhuma área cadastrada")).toBeInTheDocument();
  });

  it("não exibe placeholder quando há áreas", () => {
    render(<PropertyMap areas={AREAS_WITH_BOUNDARY} onAddArea={onAddArea} />);
    expect(screen.queryByText("Nenhuma área cadastrada")).not.toBeInTheDocument();
  });

  it("chama onAddArea ao clicar no botão +", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} />);
    fireEvent.click(screen.getByLabelText("Adicionar área"));
    expect(onAddArea).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que falha**

```bash
cd GeoMap/frontend
npx vitest run src/tests/PropertyMap.test.tsx
```

Expected: FAIL — `Cannot find module '../components/PropertyMap'`

- [ ] **Step 3: Criar `frontend/src/components/PropertyMap.tsx`**

```typescript
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AreaListResponse } from "../types";

interface PropertyMapProps {
  areas: AreaListResponse;
  onAddArea: () => void;
}

export default function PropertyMap({ areas, onAddArea }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

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

  // Atualizar camadas ao mudar áreas
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remover camadas GeoJSON existentes
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
      const layer = L.geoJSON(feature as GeoJSON.Feature, {
        style: { color: "#60a5fa", fillColor: "#1e40af", fillOpacity: 0.4, weight: 1.5 },
      }).addTo(map);
      bounds.push(layer.getBounds());
    });

    if (bounds.length > 0) {
      const combined = bounds.reduce((acc, b) => acc.extend(b));
      map.fitBounds(combined, { padding: [20, 20] });
    }
  }, [areas]);

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

- [ ] **Step 4: Executar o teste para confirmar que passa**

```bash
cd GeoMap/frontend
npx vitest run src/tests/PropertyMap.test.tsx
```

Expected: PASS — 4 testes passando.

- [ ] **Step 5: Commit**

```bash
cd GeoMap
git add frontend/src/components/PropertyMap.tsx frontend/src/tests/PropertyMap.test.tsx
git commit -m "feat: PropertyMap component com testes"
```

---

## Task 10: Componente AreaUploadModal

**Files:**
- Create: `frontend/src/components/AreaUploadModal.tsx`

- [ ] **Step 1: Criar `frontend/src/components/AreaUploadModal.tsx`**

```typescript
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AreaUploadModalProps {
  open: boolean;
  hasBoundary: boolean;
  onClose: () => void;
  onUpload: (file: File, type: "boundary" | "internal") => Promise<void>;
}

export default function AreaUploadModal({
  open,
  hasBoundary,
  onClose,
  onUpload,
}: AreaUploadModalProps) {
  const [areaType, setAreaType] = useState<"boundary" | "internal">("boundary");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleFile(f: File) {
    if (!f.name.endsWith(".geojson") && !f.name.endsWith(".json")) {
      setError("Selecione um arquivo .geojson ou .json");
      return;
    }
    setFile(f);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Selecione um arquivo");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onUpload(file, areaType);
      setFile(null);
      setAreaType("boundary");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fazer upload");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setError(null);
    setAreaType("boundary");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Adicionar Área</h2>

        {/* Seletor de tipo */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Tipo de área</p>
          <div className="flex gap-2">
            <button
              onClick={() => setAreaType("boundary")}
              className={cn(
                "px-4 py-2 rounded-md text-sm border transition-colors",
                areaType === "boundary"
                  ? "border-blue-500 bg-blue-950 text-blue-300"
                  : "border-border text-muted-foreground hover:border-blue-500/50",
              )}
            >
              Contorno geral
            </button>
            <button
              onClick={() => setAreaType("internal")}
              className={cn(
                "px-4 py-2 rounded-md text-sm border transition-colors",
                areaType === "internal"
                  ? "border-blue-500 bg-blue-950 text-blue-300"
                  : "border-border text-muted-foreground hover:border-blue-500/50",
              )}
            >
              Área interna
            </button>
          </div>
          {areaType === "boundary" && hasBoundary && (
            <p className="text-xs text-yellow-500 mt-2">
              ⚠️ Isso substituirá o contorno atual da propriedade.
            </p>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragging ? "border-blue-500 bg-blue-950/30" : "border-border hover:border-blue-500/50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".geojson,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {file ? (
            <p className="text-sm text-blue-300">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Arraste um arquivo <strong>.geojson</strong> ou{" "}
              <span className="text-blue-400">clique para selecionar</span>
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {/* Ações */}
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !file}>
            {loading ? "Enviando..." : "Fazer upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Executar todos os testes do frontend**

```bash
cd GeoMap/frontend
npx vitest run
```

Expected: todos passando.

- [ ] **Step 3: Commit**

```bash
cd GeoMap
git add frontend/src/components/AreaUploadModal.tsx
git commit -m "feat: AreaUploadModal component"
```

---

## Task 11: Integrar PropertyMap e AreaUploadModal no PropertyDetail

**Files:**
- Modify: `frontend/src/pages/PropertyDetail.tsx`

- [ ] **Step 1: Atualizar `frontend/src/pages/PropertyDetail.tsx`**

```typescript
import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import AppLayout from "../components/AppLayout";
import PropertyMap from "../components/PropertyMap";
import AreaUploadModal from "../components/AreaUploadModal";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../lib/api";
import { useAreas } from "../hooks/useAreas";
import type { Property } from "../types";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { areas, uploadArea } = useAreas(id!);

  useEffect(() => {
    api
      .get<Property>(`/properties/${id}`)
      .then(setProperty)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
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

        <PropertyMap areas={areas} onAddArea={() => setModalOpen(true)} />

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

- [ ] **Step 2: Executar todos os testes do frontend**

```bash
cd GeoMap/frontend
npx vitest run
```

Expected: todos passando.

- [ ] **Step 3: Verificar build sem erros de TypeScript**

```bash
cd GeoMap/frontend
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 4: Commit final**

```bash
cd GeoMap
git add frontend/src/pages/PropertyDetail.tsx
git commit -m "feat: integra PropertyMap e AreaUploadModal no PropertyDetail"
```

---

## Verificação final

- [ ] **Backend: todos os testes passando**

```bash
cd GeoMap/backend
PYTHONPATH=. .venv/Scripts/python -m pytest -v
```

Expected: 22+ testes, todos PASSED.

- [ ] **Frontend: todos os testes passando**

```bash
cd GeoMap/frontend
npx vitest run
```

Expected: todos PASSED.

- [ ] **Smoke test manual: subir os servidores**

```bash
# Terminal 1
cd GeoMap/backend && PYTHONPATH=. .venv/Scripts/python -m uvicorn main:app --reload

# Terminal 2
cd GeoMap/frontend && npm run dev
```

Abrir http://localhost:5173, logar, acessar uma propriedade — o mapa deve aparecer abaixo dos dados, com botão "+" funcional.
