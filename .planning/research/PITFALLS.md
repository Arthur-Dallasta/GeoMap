# Domain Pitfalls: Rural Property Management with Web GIS

**Domain:** Web GIS / Property Management SaaS
**Researched:** 2026-04-07
**Confidence:** HIGH (coordinate/projection issues), MEDIUM (export, performance), HIGH (multi-tenant data isolation)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or silent wrong results.

---

### Pitfall 1: Wrong Coordinate Reference System (CRS) in Stored GeoJSON

**What goes wrong:** GeoJSON from field collection apps is sometimes exported in a local projected CRS (e.g., SIRGAS 2000 / UTM zone 23S, EPSG:31983) rather than WGS84 (EPSG:4326). Leaflet and Mapbox GL JS expect all GeoJSON coordinates to be WGS84 decimal degrees. Polygons appear in the ocean, at 0,0, or simply don't render.

**Why it happens:** The field app may default to the Brazilian official geodetic system or a UTM projection. The user just exports whatever the app produces and uploads it. The system has no way to know unless it validates.

**Consequences:** Silent failure — polygons are stored but map shows nothing or shows geometry thousands of kilometers off. Data is not corrupted, but it appears broken to the user. Support burden is high because the error is invisible.

**Prevention:**
- On upload, inspect the GeoJSON for a `crs` member (legacy RFC 7946 pre-2016 files sometimes include it). If present and not EPSG:4326, reject with a clear error message.
- Validate that all coordinates are within valid WGS84 bounds: longitude -180 to 180, latitude -90 to 90. Coordinates that look like Cartesian meters (e.g., x=723000, y=7456000) are a dead giveaway.
- Display a bounding box check on upload: "Your property was detected in [municipality/state]. Is this correct?" This catches projection errors before they become support tickets.
- Store only EPSG:4326 in the database. Reject or ask for re-export if source CRS is anything else.

**Detection (warning signs):**
- Coordinates with values greater than 180 in absolute value
- Coordinates that are round integers (e.g., 723000.0)
- Polygon bounding box centroid does not fall within Brazil lat/lon range (-34 to 5 lat, -74 to -28 lon)

**Phase:** Address in the GeoJSON import phase (Phase 2 or whenever upload is built).

---

### Pitfall 2: Invalid GeoJSON Geometry (Self-Intersections, Winding Order, Unclosed Rings)

**What goes wrong:** GeoJSON produced by field apps can have subtle geometry errors — self-intersecting rings, wrong winding order (exterior ring clockwise instead of counterclockwise per RFC 7946), unclosed rings, or duplicate vertices. These files are valid JSON, will parse without error, and may even render visually on the map — but will break PostGIS spatial queries silently.

**Why it happens:** The RFC 7946 spec requires counterclockwise exterior rings and clockwise holes. Many apps ignore this. Self-intersections happen when GPS trace crosses itself. Unclosed rings happen when export code has a bug.

**Consequences:**
- ST_Area(), ST_Intersects(), ST_Contains() return wrong results or throw errors on invalid geometries
- A polygon that "looks fine" on the map returns zero area from the database
- Future features (spatial queries, area calculations) are silently broken

**Prevention:**
- On upload, run geometry validation: check RFC 7946 winding order using `@mapbox/geojson-rewind`, check for self-intersections with `geojson-validation` or `turf.js`
- In PostGIS, always store using `ST_MakeValid()` on import and enforce with a check constraint or trigger
- Run `ST_IsValid()` on stored geometries and surface validation warnings to the user at import time, not silently
- Use `turf.kinks()` on the frontend to detect self-intersecting polygons before upload

**Detection (warning signs):**
- ST_IsValid() returns false for stored geometries
- Area calculations return 0 or negative values
- Polygons render on map but spatial queries return empty results

**Phase:** Address at GeoJSON import. ST_MakeValid() should be in the import pipeline from day one.

---

### Pitfall 3: Multi-Tenant Data Leak via Missing Row-Level Authorization

**What goes wrong:** With a multi-tenant system where each produtor sees only their own propriedades, it is easy to implement authentication but forget authorization at the data query level. API endpoints that fetch a property by ID (e.g., `GET /properties/:id`) return data for any authenticated user, not just the owner.

**Why it happens:** Developers add auth middleware (is the user logged in?) but forget ownership checks (is this user's data?). Database queries like `SELECT * FROM properties WHERE id = $1` don't filter by tenant.

**Consequences:** User A can enumerate and read User B's farm data, including GeoJSON geometry representing private land boundaries. LGPD (Brazilian data protection law) violation risk.

**Prevention:**
- Every database query that returns property or area data MUST include a `WHERE user_id = $current_user_id` clause
- Never trust the client to send their own user_id — always derive it from the authenticated session/JWT on the server
- In the ORM, consider a base repository class that automatically scopes all queries by the current tenant ID
- Write an explicit test: create two users, upload a property as User A, attempt to access it as User B — expect 403

**Detection (warning signs):**
- API endpoints that accept a resource ID without also checking `user_id`
- No integration tests for cross-tenant access
- Fetching related entities (areas, categories) without re-checking property ownership

**Phase:** Address at auth implementation. This is a Day 1 requirement, not a hardening step.

---

### Pitfall 4: Map Export Broken by Tile CORS and Canvas Taint

**What goes wrong:** Exporting the map as PNG using html2canvas or similar captures the DOM, but browser security marks the canvas as "tainted" when it contains cross-origin images (map tiles). The canvas.toDataURL() call throws a SecurityError and the export fails silently or produces a blank/partial image.

**Why it happens:** Map tiles are served from a third-party CDN (OpenStreetMap, Stadia Maps, etc.). The browser blocks canvas export of cross-origin content unless the tile server responds with `Access-Control-Allow-Origin: *` AND the tile request includes `crossOrigin: 'anonymous'` in the Leaflet layer config.

**Consequences:** The export button appears to work (no crash) but produces a blank, partial, or watermark-only image. This is the #1 reported issue with html2canvas + Leaflet combinations.

**Prevention:**
- Use a tile provider that explicitly supports CORS for canvas export: Stadia Maps and Mapbox both do. Default OpenStreetMap tile CDN (tile.openstreetmap.org) does NOT reliably support it.
- Set `crossOrigin: 'anonymous'` on the TileLayer in Leaflet
- Alternatively, use server-side rendering for export: render the map server-side with Puppeteer (headless Chrome), which avoids all canvas taint issues entirely. This is more robust and recommended.
- Test export in production environment, not just localhost — CORS behavior differs.

**Detection (warning signs):**
- Export works in localhost but fails in production
- Browser console shows "Tainted canvases may not be exported" SecurityError
- Exported image shows map polygons but missing background tiles (tiles are blank/white)

**Phase:** Address in the export phase. Do NOT defer — choose tile provider and export strategy together.

---

## Moderate Pitfalls

---

### Pitfall 5: OSM Tile Usage Policy Violation

**What goes wrong:** Using tile.openstreetmap.org tiles directly in a production app violates OSM's tile usage policy. OSM prohibits bulk/automated use, requires visible attribution in exports, and prohibits tile caching or offline prefetch.

**Why it happens:** Developers use OSM tiles in development (they're free) and ship to production without switching providers.

**Consequences:** OSM can and does block IPs of policy violators. Attribution missing in PDF exports violates ODbL license. For printed/PDF exports, the URL `openstreetmap.org/copyright` must be visible in the document.

**Prevention:**
- Use Stadia Maps (free tier available, CORS-friendly, supports attribution), or self-host tiles with OpenMapTiles for full control
- Always render attribution text ("© OpenStreetMap contributors") in exported images/PDFs — include it as an overlay burned into the export, not just visible on screen
- Set a tile provider switch point before any production launch

**Phase:** Address during infrastructure setup, before first production deploy.

---

### Pitfall 6: GeoJSON Upload File Size Not Bounded

**What goes wrong:** A GeoJSON file from a field app representing a large farm with detailed boundary traces can be 10–50 MB. Without file size limits, a malicious or accidental upload can consume server memory, fill storage, or cause a timeout that leaves the import in a broken partial state.

**Why it happens:** Developers set no `maxFileSize` limit on upload endpoints, trusting that "normal users won't do this."

**Consequences:**
- Server OOM crash on large file parse
- Database storage fills up over time
- No feedback to user if upload times out

**Prevention:**
- Set an explicit file size limit (e.g., 10 MB) with a clear error message explaining GeoJSON simplification
- Validate the feature count on upload: if a single property has more than N polygons (e.g., 500), warn the user
- Use streaming JSON parse (e.g., `oboe.js` or server-side streaming) if files can be large
- Store GeoJSON as individual features in the database (one row per area), not as a single blob

**Phase:** Address at GeoJSON import phase.

---

### Pitfall 7: Leaflet Map Not Resizing After Container Layout Changes

**What goes wrong:** The Leaflet map renders at the wrong size or shows gray tiles when the container div changes size after initial render (e.g., sidebar opens/closes, tab switches, modal opens). This is a well-known Leaflet quirk.

**Why it happens:** Leaflet calculates tile grid dimensions at init time. If the container CSS changes (display: none then shown, or flexbox reflow), Leaflet doesn't know.

**Consequences:** Map shows gray tiles, panning jumps, or map is completely invisible until page refresh.

**Prevention:**
- Call `map.invalidateSize()` whenever the map container becomes visible or its dimensions change
- If using a framework with tabs or modals, hook into the "after show" lifecycle event to trigger `invalidateSize()`
- Set explicit pixel height on the map container div, never rely on percentage height alone without a known parent height

**Phase:** Address in frontend UI integration. Easy fix when known, very confusing to debug when not.

---

### Pitfall 8: PDF Export is Just a Rasterized Image (Not True PDF)

**What goes wrong:** Client-side PDF export via jsPDF + html2canvas produces a PDF that is just a screenshot embedded in a PDF container. It has no selectable text, no metadata, no layers, and prints at low resolution if not configured correctly.

**Why it happens:** It's the easiest implementation path, and looks acceptable in screenshots.

**Consequences:** Users who want to use the exported map in official documents or print at high DPI are disappointed. "Print quality" export is a stated requirement in the project.

**Prevention:**
- Set explicit DPI scaling: use `window.devicePixelRatio * 2` for the canvas scale, then scale down in jsPDF to maintain physical size at high resolution
- Include farm metadata (name, area, municipality) as actual PDF text above the map image using jsPDF's text API — don't embed it in the screenshot
- Consider server-side Puppeteer rendering for better quality and CORS avoidance (see Pitfall 4)

**Phase:** Address in export phase. Define "acceptable quality" before implementing.

---

## Minor Pitfalls

---

### Pitfall 9: Category Color Stored as Free-Text String

**What goes wrong:** User-defined category colors stored as arbitrary strings ("red", "#FF0000", "rgb(255,0,0)") without normalization cause inconsistent map rendering across browsers and complicate export.

**Prevention:** Always normalize and store colors as 6-digit hex strings (#RRGGBB). Validate on input. Use a color picker component that outputs hex.

**Phase:** Data model design phase.

---

### Pitfall 10: map.fitBounds() Called on Empty GeoJSON

**What goes wrong:** When a property has no areas yet (new import or empty GeoJSON), calling `map.fitBounds(layer.getBounds())` on an empty layer throws an error because the bounds object is invalid.

**Prevention:** Always check `layer.getLayers().length > 0` before calling `fitBounds()`. Fall back to a default center (center of Brazil, or user's last known view).

**Phase:** Frontend development. Guard this explicitly.

---

### Pitfall 11: GeoJSON Feature IDs Collide Across Imports

**What goes wrong:** GeoJSON features may have `id` fields set by the collection app (often sequential integers starting from 1). If you use the GeoJSON `id` as a database key, re-importing a different property's GeoJSON overwrites existing records.

**Prevention:** Always generate UUIDs on the server side for area records. Treat GeoJSON `id` as metadata/display only, never as a database key.

**Phase:** Data model design phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| GeoJSON import | Wrong CRS / non-WGS84 coordinates | Validate coordinate range on upload |
| GeoJSON import | Invalid geometry (self-intersection) | Run ST_MakeValid() + turf.kinks() |
| GeoJSON import | File size unbounded | Enforce max file size + feature count |
| GeoJSON import | Feature ID collision | Always generate server-side UUIDs |
| Auth / multi-tenant | Cross-tenant data access | WHERE user_id = $current on every query |
| Map rendering | Tile CORS breaking export | Choose CORS-friendly tile provider early |
| Map rendering | Container resize gray tiles | Always call map.invalidateSize() |
| Map export | Canvas taint from tiles | Server-side Puppeteer or CORS tile CDN |
| Map export | Low-res / text-less PDF | Scale canvas 2x, add text metadata separately |
| Map export | Missing OSM attribution | Burn attribution into exported image |
| Data model | Color normalization | Store as #RRGGBB hex, validate on input |
| Infrastructure | OSM tile policy violation | Switch to Stadia/Mapbox before production |

---

## Sources

- [More than you ever wanted to know about GeoJSON — macwright.com](https://macwright.com/2015/03/23/geojson-second-bite.html)
- [PostGIS SRIDs Explained: Why Your Spatial Queries Return Wrong Results](https://dev.to/philip_mcclarence_2ef9475/postgis-srids-explained-why-your-spatial-queries-return-wrong-results-3lcc)
- [geojson-invalid-geometry: List of GeoJSON invalid geometry issues](https://github.com/chrieke/geojson-invalid-geometry)
- [mapbox/geojson-rewind: enforce polygon ring winding order](https://github.com/mapbox/geojson-rewind)
- [Solving Large GeoJSON Issues in Mapbox](https://medium.com/@manikandanthangaraj/solving-large-geojson-issues-in-mapbox-a-personal-experience-72a08e25a1c3)
- [Leaflet-Save-Map-to-PNG: html2canvas CORS issues](https://github.com/tegansnyder/Leaflet-Save-Map-to-PNG)
- [Exporting using Leaflet — html2canvas issue #567](https://github.com/niklasvh/html2canvas/issues/567)
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
- [OpenStreetMap Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)
- [Working with large GeoJSON sources in Mapbox GL JS](https://docs.mapbox.com/help/troubleshooting/working-with-large-geojson-data/)
- [GeoJSON File Errors: Common Errors & Simple Solutions](https://tracextech.com/geojson-file-errors/)
- [Handling GeoJSON Files with Unspecified Projected Coordinate Systems](https://www.avenza.com/resources/blog/2017/01/31/handling-geojson-files-unspecified-projected-coordinate-systems/)
