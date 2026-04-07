# Technology Stack

**Project:** Sistema de Gestão de Propriedades Rurais
**Researched:** 2026-04-07
**Confidence:** HIGH (verified against official docs and multiple current sources)

---

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

> **PostGIS vs plain JSONB decision:** Storing GeoJSON polygons as PostgreSQL `JSONB` is simpler to start but locks you out of spatial indexing and area calculations. PostGIS adds ~5 minutes of setup and unlocks `ST_Area`, `ST_Intersects`, bounding-box queries, and direct `ST_AsGeoJSON` export. Use PostGIS.

### Map Library

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Leaflet | 1.9.x | Core map engine | No API key required (unlike Mapbox GL JS), MIT licensed, ~40 KB, handles GeoJSON polygons natively via `L.geoJSON()` with per-feature style functions. Sufficient for this use case: static polygon display, no 3D, no vector tiles. |
| React Leaflet | 4.x | React wrapper for Leaflet | Exposes Leaflet primitives as React components. `<GeoJSON>` component accepts a `style` callback — trivially maps a category's hex color to `fillColor`. |
| react-leaflet-cluster | 2.x | (optional) | Not needed for polygons but available if point markers are added later. |

> **Why not MapLibre GL JS / Mapbox GL JS:** MapLibre/Mapbox shine for WebGL-rendered vector tiles and 3D terrain — none of which this project needs. They add significant bundle weight and complexity. Leaflet renders up to ~10,000 SVG polygons smoothly, well above any realistic rural property use case. OpenLayers is more capable but has steeper learning curve and larger bundle with no benefit here.

### Tile Provider

| Technology | Purpose | Why |
|------------|---------|-----|
| OpenStreetMap (via Leaflet default TileLayer) | Base map tiles | Free, no API key, global coverage including rural Brazil. Esri World Imagery is a free alternative for satellite view — useful for rural property context. |

### Map Export (Image / PDF)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| leaflet-image | 0.4.x | Capture Leaflet map canvas to PNG | Purpose-built for Leaflet tile+vector export. Handles tile cross-origin issues that break html2canvas. |
| jsPDF | 2.x | Wrap PNG into PDF | Lightweight, browser-side PDF generation. Combine with leaflet-image: capture → PNG → embed in PDF. |

> **Why not html2canvas:** html2canvas frequently misses Leaflet tiles and produces blank maps due to CORS restrictions on tile servers. leaflet-image reads directly from Leaflet's internal canvas layers, bypassing the DOM screenshot problem.

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

---

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

---

## Installation

```bash
# Create Next.js app
npx create-next-app@latest --typescript --tailwind --app

# Database / ORM
npm install prisma @prisma/client
npx prisma init

# Auth
npm install better-auth

# Map
npm install leaflet react-leaflet
npm install -D @types/leaflet

# GeoJSON types
npm install -D @types/geojson

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# Map export
npm install leaflet-image jspdf

# UI components (shadcn — interactive CLI setup)
npx shadcn@latest init
```

---

## Architecture Note for Roadmap

The stack is intentionally **full-stack Next.js** (no separate Express/FastAPI backend). API routes under `app/api/` handle:
- Auth endpoints (Better Auth handlers)
- Property CRUD
- GeoJSON file upload + parsing + persistence to PostGIS

Row-level multi-tenancy is enforced in every API route by reading `session.user.id` and filtering all DB queries by `userId`. No middleware magic — explicit filtering per query.

---

## Sources

- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant) — official, HIGH confidence
- [Prisma + Better Auth + Next.js](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs) — official, HIGH confidence
- [Map libraries popularity comparison 2025](https://www.geoapify.com/map-libraries-comparison-leaflet-vs-maplibre-gl-vs-openlayers-trends-and-statistics/) — MEDIUM confidence
- [React map library comparison — LogRocket](https://blog.logrocket.com/react-map-library-comparison/) — MEDIUM confidence
- [leaflet-image + jsPDF example](https://gist.github.com/ka7eh/88761650efd3425080035e8535230d15) — MEDIUM confidence
- [Prisma ORM Production Guide Next.js 2025](https://www.digitalapplied.com/blog/prisma-orm-production-guide-nextjs) — MEDIUM confidence
- [PostGIS GeoJSON import guide](https://dohost.us/index.php/2025/11/15/importing-geospatial-data-shapefiles-geojson-kml-into-postgis/) — MEDIUM confidence
