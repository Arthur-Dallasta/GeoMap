# Research Summary — Sistema de Gestão de Propriedades Rurais

## Recommended Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | Full-stack monorepo; handles multi-tenancy natively; no separate backend needed |
| Auth | Better Auth + Prisma adapter | Self-hosted, TypeScript-first, no per-user pricing; Prisma integration native |
| Database | PostgreSQL + JSONB (geometry) | JSONB sufficient — no spatial queries needed; PostGIS adds cost with zero benefit at v1 scope |
| Map library | React Leaflet v4 + Leaflet 1.9 | MIT license, no API key, native GeoJSON layer with per-feature style callbacks |
| Tile provider | Stadia Maps (free tier) | CORS-friendly tiles required for canvas export; OSM default tiles break canvas taint |
| Map export | leaflet-image + jsPDF | Reads Leaflet's internal canvas directly; html2canvas breaks on tile CORS |
| Validation | turf.js (client) + zod | GeoJSON geometry validation + schema validation |
| Forms | react-hook-form + zod | Standard Next.js form pattern |

## Table Stakes Features (v1)

- User registration (nome, CPF, sexo, email, senha) and login
- Tenant isolation — producer sees only their own data
- Property CRUD (nome, localização, município, estado, CEP, áreas em ha, pessoas envolvidas, área vegetal)
- GeoJSON upload → auto-create areas (one row per Feature polygon)
- Area editing (name + details post-import)
- Category management (create/edit/delete with name + color)
- Category assignment to areas
- Interactive map: property boundary + colored/named area polygons
- Map export (PNG image + PDF)

## Architecture Overview

```
Browser
  └── Next.js App Router (pages + API routes)
        ├── Auth layer (Better Auth — middleware + session)
        ├── Property CRUD (API routes + Prisma)
        ├── GeoJSON import pipeline
        │     ├── Upload (Multer in-memory, 10MB cap)
        │     ├── Parse + validate (turf.kinks, coordinate range check)
        │     └── Store (one DB row per GeoJSON Feature, geometry as JSONB)
        ├── Map render (React Leaflet — GeoJSON layer, category color style)
        └── Export (leaflet-image → canvas → jsPDF)
              └── Tile provider: Stadia Maps (CORS-enabled)

Database: PostgreSQL
  ├── users (id, name, cpf, sex, email, passwordHash)
  ├── properties (id, userId, name, location fields, area fields)
  ├── areas (id, propertyId, name, geometry JSONB, categoryId)
  └── categories (id, userId, name, color)
```

**Build order:** Auth → Property CRUD → GeoJSON Import → Map Render + Categories → Export

## Top 5 Pitfalls to Avoid

1. **CRS mismatch (coordinate projection)** — Brazilian GPS apps export UTM/SIRGAS, not WGS84. Polygons parse fine but render thousands of km off. Fix: validate that all coordinates are in WGS84 range (-180/180 lng, -90/90 lat) at upload time.

2. **Canvas taint from tile CORS (export)** — Default OSM tiles block canvas export silently. Fix: use Stadia Maps (or other CORS-friendly provider) from day one; set `crossOrigin: true` on TileLayer.

3. **Cross-tenant data leak** — Auth checks session presence but not resource ownership. Fix: every DB query must include `WHERE userId = $current`. Enforce at repository layer with integration test from the first endpoint.

4. **Invalid GeoJSON geometry** — Self-intersections and wrong winding order are invisible to users but break rendering. Fix: validate with `turf.kinks()` client-side; reject invalid geometries at the API with a clear error message.

5. **OSM tile usage policy** — `tile.openstreetmap.org` prohibits production use; attribution required in exports. Fix: use Stadia Maps for tiles; always include OSM attribution text in PDF exports.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| JSONB over PostGIS | No spatial queries needed; PostGIS complexity not justified for polygon display only |
| One DB row per GeoJSON Feature | Enables per-area CRUD; storing one blob per file would make editing impossible |
| Stadia Maps as tile provider | Only CORS-friendly free tier that works with leaflet-image canvas export |
| Client-side export (leaflet-image + jsPDF) | Simpler v1; Puppeteer server-side is a v2 upgrade if PDF quality needs improvement |
| Better Auth over Clerk/NextAuth | Self-hosted, no per-user pricing, Prisma adapter native |

## Suggested Phase Structure

1. **Foundation** — Auth + multi-tenant base + property CRUD
2. **GeoJSON Import Pipeline** — upload, validate, parse, store areas
3. **Map Rendering + Categories** — React Leaflet + category color/name display
4. **Export** — PNG + PDF with CORS tile provider
5. **Polish** — area summary, property stats, UX improvements

---
*Generated: 2026-04-07*
