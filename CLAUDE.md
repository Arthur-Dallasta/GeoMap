<!-- GSD:project-start source:PROJECT.md -->
## Project

**Sistema de Gestão de Propriedades Rurais**

Sistema web para cadastro e gestão de propriedades rurais. Produtores rurais registram suas propriedades com dados detalhados, importam dados georreferenciados (GeoJSON) coletados por aplicativo externo, e visualizam um mapa interativo personalizado com as áreas da propriedade identificadas e categorizadas. Cada área pode receber uma categoria criada pelo próprio usuário (com nome e cor), tornando o mapa visual e informativo.

**Core Value:** O produtor consegue visualizar um mapa personalizado de sua propriedade — com contorno geral e áreas internas coloridas por categoria — gerado a partir de dados georreferenciados importados.

### Constraints

- **Formato de importação**: GeoJSON — formato padrão definido pelo app externo de coleta
- **Hierarquia**: Dois níveis (Propriedade → Áreas) — estrutura suficiente para o caso de uso atual
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Architecture: Frontend + Backend Separados

Frontend React (SPA) e backend FastAPI (Python) como serviços independentes, comunicando via REST API.

### Frontend
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React.js | 19.x | UI framework | SPA com hooks para gerenciamento de estado do mapa (polígono selecionado, categoria atribuída) |
| Vite | 6.x | Build tool | HMR rápido, configuração simples, amplamente adotado com React |
| React Router | v7 | Client-side routing | Roteamento SPA — suficiente para app autenticada sem necessidade de SSR/SEO |
| TypeScript | 5.x | Language | Tipagem nos componentes React, chamadas API, e tipos GeoJSON |
### Backend
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.12+ | Backend language | Ecossistema maduro para geoespacial (GDAL, Shapely, GeoPandas) |
| FastAPI | 0.115+ | API framework | Tipagem forte, docs OpenAPI automáticas, performance assíncrona, suporte nativo a upload de arquivos |
| SQLAlchemy | 2.0 | ORM | Type-safe queries, suporte a PostGIS via GeoAlchemy2, migrations via Alembic |
| Alembic | 1.x | Database migrations | Evolução controlada do schema — padrão do ecossistema SQLAlchemy |
| GeoAlchemy2 | 0.15+ | PostGIS integration | Tipos `Geometry` nativos no SQLAlchemy, queries espaciais tipadas |
### Authentication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| JWT (python-jose) | — | Token-based auth | Stateless, compatível com SPA + API separada |
| passlib + bcrypt | — | Password hashing | Hash seguro com salt automático — padrão Python |
| OAuth2PasswordBearer | — | FastAPI auth flow | Flow padrão do FastAPI com suporte a Bearer token |
### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16.x | Primary database | Maduro, confiável, suporte nativo ao PostGIS |
| PostGIS | 3.x | Spatial extension | `geometry` type nativo, `ST_AsGeoJSON()` para export, queries espaciais (bounding box, interseção) |
### Map Library
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Leaflet | 1.9.x | Core map engine | Sem API key, MIT, leve (~40KB), `L.geoJSON()` nativo com per-feature style |
| React Leaflet | 4.x | React wrapper | Componentes React para primitivas Leaflet. `<GeoJSON>` aceita `style` callback para cores por categoria |
### Geospatial Processing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Turf.js | 7.x | Client-side geo computations | Cálculos leves no browser (área, centroide, bounding box) |
| GDAL/OGR (Python) | 3.x | Server-side geo processing | Validação e transformação de GeoJSON, reprojeção de CRS, parsing robusto de arquivos geoespaciais |
| Shapely | 2.x | Server-side geometry ops | Manipulação de geometrias no Python — validação, simplificação, cálculo de área |
### File Upload
| Technology | Purpose | Why |
|------------|---------|-----|
| FastAPI UploadFile | Upload de GeoJSON | Nativo do FastAPI com suporte a streaming, validação de tipo e tamanho — substitui Multer |
| python-multipart | Parser multipart | Dependência do FastAPI para upload de arquivos |
### Map Export (Image / PDF)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| leaflet-image | 0.4.x | Capture map canvas to PNG | Purpose-built para Leaflet tile+vector export |
| jsPDF | 2.x | Wrap PNG em PDF | Geração de PDF client-side, leve |
### Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | UI styling | Utility-first, sem overhead de CSS-in-JS em runtime |
| shadcn/ui | latest | Component library | Componentes acessíveis baseados em Radix UI + Tailwind. Modelo copy-paste sem dependência extra |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.x | Form state management | Formulário de propriedade com 10+ campos; RHF evita re-render por keystroke |
| zod | 3.x | Schema validation (frontend) | Validação de inputs no frontend. Pairs com react-hook-form via `@hookform/resolvers` |
| Pydantic | 2.x | Schema validation (backend) | Validação de GeoJSON imports no servidor, schemas de request/response — nativo do FastAPI |
| @types/geojson | 7946.x | TypeScript types for GeoJSON | Tipos TS oficiais para `FeatureCollection`, `Feature<Polygon>` |
| CORS middleware | — | Cross-origin requests | Necessário para SPA + API em domínios/portas diferentes |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Architecture | Frontend + Backend separados | Monolito Next.js | Next.js não aproveita o ecossistema geoespacial Python; Prisma tem suporte limitado a PostGIS |
| Map library | Leaflet + React Leaflet | MapLibre GL JS | Overkill para polígonos SVG; requer WebGL; sem benefício para este caso |
| Map library | Leaflet + React Leaflet | OpenLayers | API GIS mais poderosa mas curva de aprendizado íngreme e bundle maior |
| Auth | JWT (python-jose) | Better Auth | Better Auth é JS-only; JWT é padrão para APIs Python |
| ORM | SQLAlchemy 2.0 + GeoAlchemy2 | Prisma | Prisma suporta PostGIS apenas via `Unsupported("geometry")` e raw SQL; SQLAlchemy + GeoAlchemy2 oferecem tipagem nativa |
| Upload | FastAPI UploadFile | Multer | Multer é middleware Express/Node.js — incompatível com FastAPI |
| Database | PostgreSQL + PostGIS | MongoDB | Sem vantagem em indexação espacial; schemas Mongoose menos ergonômicos para hierarquia relacional |
| Export | leaflet-image + jsPDF | html2canvas | html2canvas falha em CORS de tiles; não é purpose-built para mapas |
## Installation
# Frontend (React + Vite)
# Backend (FastAPI)
# Database (PostgreSQL + PostGIS)
# Auth (JWT + passlib)
# Map (Leaflet + React Leaflet)
# Geospatial (Turf.js + GDAL + Shapely)
# Forms & validation (react-hook-form + zod + Pydantic)
# Map export (leaflet-image + jsPDF)
# UI components (shadcn — interactive CLI setup)
## Architecture Note for Roadmap
- Frontend: React SPA (Vite) — rotas, formulários, mapa, export
- Backend: FastAPI — auth JWT, Property CRUD, GeoJSON upload/parsing/persistência em PostGIS
- API REST entre frontend e backend (CORS configurado)
## Sources
- [FastAPI Security - OAuth2 with Password](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) — official, HIGH confidence
- [GeoAlchemy2 Tutorial](https://geoalchemy-2.readthedocs.io/en/latest/tutorial.html) — official, HIGH confidence
- [SQLAlchemy 2.0 + FastAPI](https://fastapi.tiangolo.com/tutorial/sql-databases/) — official, HIGH confidence
- [Map libraries popularity comparison 2025](https://www.geoapify.com/map-libraries-comparison-leaflet-vs-maplibre-gl-vs-openlayers-trends-and-statistics/) — MEDIUM confidence
- [leaflet-image + jsPDF example](https://gist.github.com/ka7eh/88761650efd3425080035e8535230d15) — MEDIUM confidence
- [PostGIS GeoJSON import guide](https://dohost.us/index.php/2025/11/15/importing-geospatial-data-shapefiles-geojson-kml-into-postgis/) — MEDIUM confidence
- [GDAL/OGR Python bindings](https://gdal.org/api/python.html) — official, HIGH confidence
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
