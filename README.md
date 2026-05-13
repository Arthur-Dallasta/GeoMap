# GeoMap — Sistema de Gestao de Propriedades Rurais

Sistema web para cadastro e gestao de propriedades rurais. Produtores registram suas propriedades, importam dados georreferenciados (GeoJSON) e visualizam um mapa interativo com areas coloridas por categoria.

## Estrutura do Projeto

```
GeoMap/
├── docker-compose.yml   # Banco de dados (PostgreSQL + PostGIS)
├── backend/             # API FastAPI (Python)
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── alembic/         # Migrations
│   └── app/
│       ├── auth/
│       ├── properties/
│       ├── areas/
│       └── categories/
└── frontend/            # SPA React + Vite (TypeScript)
    ├── package.json
    └── src/
```

## Pre-requisitos

- [Docker](https://www.docker.com/) (para o banco de dados)
- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)

---

## Rodando do Zero

### 1. Banco de Dados

Suba o PostgreSQL com PostGIS via Docker Compose:

```bash
docker compose up -d
```

Isso cria um container com:
- PostgreSQL 16 + PostGIS 3.4
- Usuario: `geomap` / Senha: `geomap` / Banco: `geomap`
- Porta local: **5433**

Verifique que esta rodando:

```bash
docker compose ps
```

---

### 2. Backend (FastAPI)

```bash
cd backend
```

**Crie e ative o ambiente virtual:**

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate
```

**Instale as dependencias:**

```bash
pip install -r requirements.txt
```

**Configure as variaveis de ambiente:**

```bash
cp .env.example .env
```

O arquivo `.env` padrao ja funciona com o Docker Compose (porta 5433). Ajuste `SECRET_KEY` se necessario:

```env
DATABASE_URL=postgresql+psycopg://geomap:geomap@localhost:5433/geomap
SECRET_KEY=troque-me-em-producao
```

**Execute as migrations do banco:**

```bash
alembic upgrade head
```

**Inicie o servidor:**

```bash
uvicorn main:app --reload
```

A API estara disponivel em `http://localhost:8000`.
Documentacao interativa: `http://localhost:8000/docs`

---

### 3. Frontend (React + Vite)

```bash
cd frontend
```

**Instale as dependencias:**

```bash
npm install
```

**Inicie o servidor de desenvolvimento:**

```bash
npm run dev
```

O frontend estara disponivel em `http://localhost:5173`.

---

## Resumo dos Servicos

| Servico    | URL                          | Descricao                     |
|------------|------------------------------|-------------------------------|
| Frontend   | http://localhost:5173        | Interface web (React + Vite)  |
| Backend    | http://localhost:8000        | API REST (FastAPI)            |
| API Docs   | http://localhost:8000/docs   | Swagger UI interativo         |
| Banco      | localhost:5433               | PostgreSQL + PostGIS          |

---

## Comandos Uteis

### Backend

```bash
# Rodar testes
cd backend
pytest

# Criar nova migration apos alterar modelos
alembic revision --autogenerate -m "descricao"

# Aplicar migrations pendentes
alembic upgrade head

# Reverter ultima migration
alembic downgrade -1
```

### Frontend

```bash
# Build de producao
npm run build

# Lint
npm run lint
```

### Docker

```bash
# Parar o banco
docker compose down

# Parar e remover os dados (reset completo)
docker compose down -v
```

---

## Stack de Tecnologias

**Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, React Router v7, React Hook Form, Zod, Leaflet, shadcn/ui

**Backend:** FastAPI, SQLAlchemy 2.0, Alembic, GeoAlchemy2, Pydantic 2, psycopg3, python-jose, passlib

**Banco:** PostgreSQL 16 + PostGIS 3.4
