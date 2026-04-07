# Architecture Patterns

**Domain:** Multi-tenant rural property management web system with GIS/map features
**Researched:** 2026-04-07

## Recommended Architecture

Three-tier web application: React SPA frontend, Node.js/Express REST API backend, PostgreSQL database. No microservices — scope does not justify it.

```
[Browser]
  └── React SPA
        ├── Map Layer (Leaflet + react-leaflet)
        ├── UI Layer (forms, CRUD views)
        └── Export Layer (leaflet-image + jsPDF)

[API Server]
  └── Node.js / Express
        ├── Auth middleware (JWT)
        ├── /api/properties       (CRUD)
        ├── /api/areas            (CRUD + category assignment)
        ├── /api/categories       (CRUD)
        └── /api/upload/geojson   (Multer → parse → store)

[Database]
  └── PostgreSQL
        ├── users
        ├── properties
        ├── areas  (geometry stored as JSONB column)
        └── categories
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| React SPA | Render UI, map, export, call REST API | API Server (HTTP/JSON) |
| Leaflet map module | Render polygons from GeoJSON, handle interactivity | React state (receives GeoJSON) |
| Express REST API | Business logic, auth, file parsing, DB queries | Frontend (JSON), PostgreSQL |
| Multer middleware | Accept multipart file upload, buffer in memory | Express route handler |
| GeoJSON parser | Validate and extract features from uploaded file | Express route → DB write |
| PostgreSQL | Persist all structured and geometry data | Express only |

The frontend never talks directly to the database. All geometry access goes through the API.

---

## Spatial Storage Decision: JSONB Column (not PostGIS)

**Recommendation: Store geometries as `JSONB` in PostgreSQL, not PostGIS geometry type.**

Rationale:
- The system does NOT perform spatial queries (no proximity search, no spatial intersections, no bounding box queries). It only stores and retrieves polygons for display.
- PostGIS adds operational complexity (extension install, geometry type casting, migration complexity) with zero functional benefit for this use case.
- JSONB preserves the original GeoJSON structure exactly, making round-trip serialization to the frontend trivial.
- ST_AsGeoJSON() overhead is eliminated — data is already GeoJSON-ready.
- If spatial queries are needed in a future version, migration from JSONB to PostGIS geometry is straightforward.

**Schema sketch:**
```sql
CREATE TABLE areas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  category_id UUID REFERENCES categories(id),
  name        TEXT,
  geometry    JSONB NOT NULL,   -- stores GeoJSON Feature geometry object
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON areas USING gin(geometry);  -- optional, for future queries
```

---

## GeoJSON Import → Map Render Pipeline

```
1. USER uploads .geojson file via browser form
        ↓
2. POST /api/upload/geojson  (multipart/form-data)
   - Multer buffers file in memory (no disk write needed)
        ↓
3. Express parses buffer as JSON
   - Validates top-level "type": "FeatureCollection" or "Feature"
   - Rejects malformed files with 422 response
        ↓
4. For each Feature in FeatureCollection:
   - Insert row into `areas` table
   - geometry = feature.geometry (JSONB)
   - name = feature.properties.name ?? "Área [n]"
   - category_id = NULL (user assigns later)
        ↓
5. API returns list of created area IDs + names
        ↓
6. Frontend fetches GET /api/properties/:id/areas
   - Response: array of { id, name, category, geometry (GeoJSON) }
        ↓
7. React re-assembles FeatureCollection from area array
        ↓
8. Leaflet renders via <GeoJSON> layer
   - style function reads area.category.color for fill
   - tooltip/label shows area.name
        ↓
9. User sees colored, labeled polygons on interactive map
```

Key design point: the backend stores individual features as rows (not the whole FeatureCollection as one blob). This enables per-area CRUD (rename, re-categorize) without re-parsing the file.

---

## Map Export Pipeline

**Client-side export (recommended for v1):**

```
1. User clicks "Export"
        ↓
2. leaflet-image captures Leaflet map canvas → PNG blob
        ↓
3a. Image export: trigger browser download of PNG blob
3b. PDF export: pass PNG blob to jsPDF → embed in PDF → download
```

Tradeoffs accepted:
- Tile-based base maps may have CORS issues with leaflet-image. Mitigation: use OpenStreetMap tiles or disable base tile layer on export (property boundary is self-contained).
- Client-side export avoids any server infrastructure for rendering (no Puppeteer, no headless Chrome).
- If export quality becomes a problem in v2, server-side Puppeteer can be added as a separate endpoint.

---

## Multi-Tenancy Pattern

Row-level isolation via `user_id` foreign key on `properties` table. All API routes validate JWT and filter queries by `req.user.id`. No shared data between tenants.

```sql
-- Every query scoped:
SELECT * FROM properties WHERE user_id = $1;
SELECT * FROM areas WHERE property_id IN (
  SELECT id FROM properties WHERE user_id = $1
);
```

No row-level security (RLS) in PostgreSQL needed for v1 — application-layer filtering is sufficient at this scale.

---

## Suggested Build Order (dependency-driven)

```
Phase 1 — Foundation
  Auth (register/login, JWT middleware)
  Property CRUD (no geometry yet)
  Multi-tenant isolation verified

Phase 2 — GeoJSON Import Pipeline
  File upload endpoint (Multer)
  GeoJSON parse → area rows
  Areas CRUD (name edit, list)

Phase 3 — Map Rendering
  Leaflet integration in React
  Fetch areas → assemble FeatureCollection → render
  Category CRUD + color assignment
  Style polygons by category

Phase 4 — Export
  leaflet-image + jsPDF integration
  PNG and PDF download flows

Phase 5 — Polish
  Map labels (area names as tooltips/overlays)
  UX improvements, validation feedback
```

Dependency rationale:
- Map rendering (Phase 3) requires stored areas (Phase 2) to have real data to display.
- Export (Phase 4) requires a working rendered map (Phase 3).
- Categories can be built in Phase 3 because they are needed for styled rendering.
- Auth must be Phase 1: every other route depends on user identity for tenant isolation.

---

## Scalability Considerations

| Concern | At current scope (single farm per user) | At scale (thousands of users) |
|---------|-----------------------------------------|-------------------------------|
| Geometry storage | JSONB is sufficient | Add GIN index; PostGIS migration if spatial queries needed |
| File upload | In-memory buffer (Multer memStorage) | Switch to disk or S3 for large files |
| Map export | Client-side | Server-side Puppeteer for consistency |
| Auth | Stateless JWT | Same pattern, add refresh tokens |

---

## Anti-Patterns to Avoid

### Storing the whole FeatureCollection as one JSONB blob
**Why bad:** Cannot do per-area rename, re-categorize, or delete without re-parsing. All CRUD becomes file manipulation.
**Instead:** One database row per Feature, geometry column holds only `feature.geometry`.

### PostGIS for display-only geometry
**Why bad:** Adds extension dependency, migration complexity, and type casting overhead with no query benefit.
**Instead:** JSONB column as described above.

### Server-side map rendering in v1
**Why bad:** Requires headless Chrome or Puppeteer infrastructure, deployment complexity, and memory overhead.
**Instead:** Client-side leaflet-image + jsPDF covers the use case with no extra infrastructure.

### Putting geometry in the filesystem
**Why bad:** No transactional safety, harder to query even minimally, complicates backups and multi-instance deploys.
**Instead:** JSONB in PostgreSQL keeps geometry co-located with relational data.

---

## Sources

- [Using GeoJSON with Leaflet](https://leafletjs.com/examples/geojson/) — HIGH confidence, official docs
- [Constructing GeoJSON in PostgreSQL — Simon Willison](https://til.simonwillison.net/postgresql/constructing-geojson-in-postgresql) — MEDIUM confidence
- [Exporting Leaflet Map to Image in the Browser](https://dev.to/gabiaxel/exporting-leaflet-map-to-image-in-the-browser-16am) — MEDIUM confidence
- [leaflet-image + jsPDF example](https://gist.github.com/ka7eh/88761650efd3425080035e8535230d15) — MEDIUM confidence
- [Node.js Express File Upload with Multer](https://www.bezkoder.com/node-js-express-file-upload/) — MEDIUM confidence
- [How to Store GeoJSON in PostgreSQL](https://elvanco.com/blog/how-to-store-geojson-in-postgresql) — MEDIUM confidence
- [Building Location-Based Service Backend with Geospatial Data](https://www.momentslog.com/development/web-backend/building-a-location-based-service-backend-with-geospatial-data) — MEDIUM confidence
