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

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x | Full-stack framework (frontend + API routes) | App Router provides server components, API routes eliminate a separate backend, and Next.js middleware handles multi-tenant data isolation at the request layer. Official docs explicitly cover multi-tenant architecture. |
| TypeScript | 5.x | Language | Type safety across Prisma models, API responses, and GeoJSON feature types — reduces runtime errors on geometry data. |
| React | 19.x | UI layer | Bundled with Next.js 15; hooks work naturally with map state (selected polygon, category assignment). |
### Authentication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Better Auth | latest (1.x) | Auth + session management | Self-hosted (no per-user pricing), TypeScript-first, has a Prisma adapter, supports email/password out of the box. Auth.js (NextAuth v5) is the alternative but has more complex multi-tenant session handling. Better Auth is the 2025 community preference for greenfield apps. |
### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16.x | Primary database | Mature, reliable, and supports the PostGIS extension if spatial queries are ever needed. |
| PostGIS | 3.x | Spatial extension | Store polygon geometries as native `geometry` type rather than raw JSON blobs. Enables bounding-box queries (find all areas within a region) and `ST_AsGeoJSON()` for direct GeoJSON export. For v1, even if spatial queries are not used, storing geometries in PostGIS is future-proof and costs nothing extra. |
| Prisma | 5.x | ORM | First-class Next.js integration, type-safe queries generated from schema, Prisma Migrate handles schema evolution. Works natively with PostgreSQL/PostGIS via `Unsupported("geometry")` type for PostGIS columns when raw SQL is needed. |
### Map Library
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Leaflet | 1.9.x | Core map engine | No API key required (unlike Mapbox GL JS), MIT licensed, ~40 KB, handles GeoJSON polygons natively via `L.geoJSON()` with per-feature style functions. Sufficient for this use case: static polygon display, no 3D, no vector tiles. |
| React Leaflet | 4.x | React wrapper for Leaflet | Exposes Leaflet primitives as React components. `<GeoJSON>` component accepts a `style` callback — trivially maps a category's hex color to `fillColor`. |
| react-leaflet-cluster | 2.x | (optional) | Not needed for polygons but available if point markers are added later. |
### Tile Provider
| Technology | Purpose | Why |
|------------|---------|-----|
| OpenStreetMap (via Leaflet default TileLayer) | Base map tiles | Free, no API key, global coverage including rural Brazil. Esri World Imagery is a free alternative for satellite view — useful for rural property context. |
### Map Export (Image / PDF)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| leaflet-image | 0.4.x | Capture Leaflet map canvas to PNG | Purpose-built for Leaflet tile+vector export. Handles tile cross-origin issues that break html2canvas. |
| jsPDF | 2.x | Wrap PNG into PDF | Lightweight, browser-side PDF generation. Combine with leaflet-image: capture → PNG → embed in PDF. |
### Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | UI styling | Utility-first, pairs well with Next.js App Router, no runtime CSS-in-JS overhead. |
| shadcn/ui | latest | Component library | Unstyled accessible components built on Radix UI + Tailwind. Copy-paste model means no extra dependency overhead. Forms, dialogs, color pickers all available. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.x | Form state management | Property registration form has 10+ fields; RHF avoids re-render on every keystroke. |
| zod | 3.x | Schema validation | Validates GeoJSON imports server-side before persisting; validates form inputs. Pairs with react-hook-form via `@hookform/resolvers`. |
| @types/geojson | 7946.x | TypeScript types for GeoJSON | Official TS types for `FeatureCollection`, `Feature<Polygon>`, etc. Zero runtime cost. |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Map library | Leaflet + React Leaflet | MapLibre GL JS | Overkill for SVG polygon display; requires WebGL context; larger bundle; no benefit for this use case |
| Map library | Leaflet + React Leaflet | OpenLayers | More powerful GIS API but steeper learning curve, larger bundle; Leaflet handles all requirements here |
| Auth | Better Auth | Clerk | Clerk is managed SaaS with per-user pricing that becomes expensive; no vendor lock-in needed for v1 |
| Auth | Better Auth | Auth.js (NextAuth v5) | Auth.js has looser typing and more configuration ceremony for multi-tenant row-level isolation |
| ORM | Prisma | Drizzle ORM | Drizzle is lighter but ecosystem/docs less mature; Prisma's generated types align well with PostGIS geometry handling |
| Export | leaflet-image + jsPDF | html2canvas | html2canvas breaks on tile CORS; not purpose-built for maps |
| Database | PostgreSQL + PostGIS | MongoDB | No spatial indexing advantage; Mongoose schemas are less ergonomic for relational Propriedade→Área hierarchy |
## Installation
# Create Next.js app
# Database / ORM
# Auth
# Map
# GeoJSON types
# Forms & validation
# Map export
# UI components (shadcn — interactive CLI setup)
## Architecture Note for Roadmap
- Auth endpoints (Better Auth handlers)
- Property CRUD
- GeoJSON file upload + parsing + persistence to PostGIS
## Sources
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant) — official, HIGH confidence
- [Prisma + Better Auth + Next.js](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs) — official, HIGH confidence
- [Map libraries popularity comparison 2025](https://www.geoapify.com/map-libraries-comparison-leaflet-vs-maplibre-gl-vs-openlayers-trends-and-statistics/) — MEDIUM confidence
- [React map library comparison — LogRocket](https://blog.logrocket.com/react-map-library-comparison/) — MEDIUM confidence
- [leaflet-image + jsPDF example](https://gist.github.com/ka7eh/88761650efd3425080035e8535230d15) — MEDIUM confidence
- [Prisma ORM Production Guide Next.js 2025](https://www.digitalapplied.com/blog/prisma-orm-production-guide-nextjs) — MEDIUM confidence
- [PostGIS GeoJSON import guide](https://dohost.us/index.php/2025/11/15/importing-geospatial-data-shapefiles-geojson-kml-into-postgis/) — MEDIUM confidence
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
