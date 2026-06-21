# GeoMap — Sistema de Gestão de Propriedades Rurais

Sistema web para cadastro e gestão de propriedades rurais. Produtores registram suas propriedades, importam dados georreferenciados (GeoJSON) e visualizam um mapa interativo com áreas coloridas por categoria e subcategoria.

## Estrutura do Projeto

```
GeoMap/
├── docker-compose.yml   # Orquestração completa (DB + backend + frontend)
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── alembic/         # Migrations
│   └── app/
│       ├── auth/
│       ├── properties/
│       ├── areas/
│       ├── categories/
│       └── subcategories/
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf       # Serve SPA + proxy /api → backend
    ├── package.json
    └── src/
```

---

## Opção 1 — Docker (recomendado)

Roda toda a stack (banco, backend, frontend) com um único comando.

**Pré-requisito:** [Docker Desktop](https://www.docker.com/)

```bash
docker compose up --build
```

Aguarde os três containers subirem. Na primeira execução o build leva alguns minutos (download de imagens + instalação de dependências).

| Serviço  | URL                        | Descrição                      |
|----------|----------------------------|--------------------------------|
| Frontend | http://localhost           | Interface web (nginx)          |
| Backend  | http://localhost:8000      | API REST (FastAPI)             |
| API Docs | http://localhost:8000/docs | Swagger UI                     |
| Banco    | localhost:5433             | PostgreSQL + PostGIS           |

> As migrations são aplicadas automaticamente no startup do backend (`alembic upgrade head`).

**Parar os serviços:**

```bash
docker compose down
```

**Parar e apagar os dados do banco (reset completo):**

```bash
docker compose down -v
```

---

## Opção 2 — Desenvolvimento local

Para desenvolvimento com hot-reload no frontend e backend.

**Pré-requisitos:**

- [Docker](https://www.docker.com/) (apenas para o banco)
- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)

### 1. Banco de Dados

```bash
docker compose up db -d
```

Cria o PostgreSQL + PostGIS na porta **5433**.

### 2. Backend (FastAPI)

```bash
cd backend
```

**Ambiente virtual:**

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate
```

**Dependências:**

```bash
pip install -r requirements.txt
```

**Variáveis de ambiente:**

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql+psycopg://geomap:geomap@localhost:5433/geomap
SECRET_KEY=troque-me-em-producao
```

**Migrations e servidor:**

```bash
alembic upgrade head
uvicorn main:app --reload
```

API disponível em `http://localhost:8000`.

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend disponível em `http://localhost:5173`. O Vite proxy encaminha `/api/*` para `http://localhost:8000`.

---

## Comandos Úteis

### Backend

```bash
# Testes
pytest

# Nova migration após alterar modelos
alembic revision --autogenerate -m "descricao"

# Aplicar migrations
alembic upgrade head

# Reverter última migration
alembic downgrade -1
```

### Frontend

```bash
# Build de produção
npm run build

# Lint
npm run lint

# Testes
npm run test
```

### Docker

```bash
# Rebuild de um serviço específico
docker compose up --build backend

# Ver logs em tempo real
docker compose logs -f backend

# Verificar status dos containers
docker compose ps
```

---

## Stack de Tecnologias

**Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router v7, React Hook Form, Zod 4, Leaflet, shadcn/ui, jsPDF

**Backend:** FastAPI, SQLAlchemy 2.0, Alembic, GeoAlchemy2, Shapely, Pydantic 2, psycopg3, python-jose, passlib

**Banco:** PostgreSQL 16 + PostGIS 3.4

**Infraestrutura:** Docker, Docker Compose, nginx (serve SPA + proxy reverso para API)
