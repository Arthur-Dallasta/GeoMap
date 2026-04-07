# Feature Landscape

**Domain:** Rural property management web system with GIS map visualization
**Researched:** 2026-04-07

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User registration (name, CPF, sex, email, password) | Entry point for the entire system — no account, no access | Low | CPF validation (Brazilian context) is a distinct step |
| Email + password login | Standard auth expectation for any web product | Low | JWT session management required |
| Password reset via email | Users forget passwords; no recovery = permanent lockout | Low | Requires transactional email setup |
| Tenant data isolation | Each producer sees only their own properties — foundational trust | Medium | Row-level filtering on every query; no cross-tenant leakage |
| Property registration (name, location, municipality, state, CEP, total area in ha, own/leased/protected/vegetal area, people involved) | Core data the system was built to store | Low-Medium | Area fields are numeric with ha unit; municipality + state = structured address |
| Property list view | Users need to navigate between multiple properties | Low | Sortable, searchable list |
| GeoJSON file upload per property | Primary data import mechanism; without it, map has nothing to display | Medium | Validate file format, parse FeatureCollection, persist geometries |
| Auto-creation of areas from GeoJSON features | Each polygon/feature becomes a named area automatically | Medium | Depends on GeoJSON import |
| Area detail editing (name, description) | Producers need to label what each area represents | Low | Non-geometric edits only — geometry is immutable post-import |
| Category management (create/edit/delete, name + color) | Required to assign meaning and visual identity to areas | Low | Color picker UI; categories scoped per tenant |
| Assign category to area | Core visual differentiator on the map | Low | Depends on categories existing |
| Interactive map view (property outline + colored areas + area names) | The main deliverable — without this, the product has no value | High | Leaflet or Mapbox; render GeoJSON geometries, color by category, label by name |
| Map export as image (PNG/JPEG) | Producers use exported maps in reports, printed documents | Medium | html2canvas or server-side rendering; common expectation in agricultural tools |
| Map export as PDF | Same use case as image export — PDF is preferred for formal documents | Medium | Depends on image export capability; add page layout layer |

---

## Differentiators

Features that set this product apart — not universally expected, but clearly valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Color-coded area legend on exported map | Exported map is self-explanatory without the system open | Low | Auto-generated legend from assigned categories |
| Area summary table (area name, category, hectares) per property | Producers often need a structured breakdown, not just a visual | Low | Computed from geometry (area in m² → ha) + category assignment |
| Property summary statistics (total area vs. own vs. leased vs. protected vs. vegetal) | Validates data integrity and gives quick operational overview | Low | Simple arithmetic on stored numeric fields |
| Map zoom-to-property on load | Immediately frames the right geographic extent for the producer | Low | Fit map bounds to GeoJSON envelope on render |
| Area count and category distribution per property | Gives a quick dashboard feel without building a full dashboard | Low | Computed at render time |
| Persistent map state (last zoom/pan position) | Power users navigate large properties; losing position is frustrating | Low | localStorage or URL params |

---

## Anti-Features

Features to deliberately NOT build in v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Free-hand geometry drawing on the map | Replicates the external collection app; adds complexity without value in v1 | Geometries come exclusively from GeoJSON import |
| Direct integration with external collection app (API sync) | Unknown app, adds coupling and auth complexity; upload is sufficient for v1 | Manual GeoJSON file upload |
| Multi-user per property (producer + technician roles) | Doubles auth and permission complexity; not in scope per PROJECT.md | Single account per producer in v1 |
| Real-time collaboration / shared editing | Overkill for individual producers; adds websocket/CRDT complexity | Not needed until multi-user is validated |
| Satellite / aerial imagery base layer | Licensing costs (Google Maps, Mapbox) escalate; adds map tile complexity | Use free tile provider (OpenStreetMap) as base |
| Crop planning / rotation / scheduling | Different product category (farm management); out of scope | Not this system's core value |
| IoT / sensor data integration | Heavy infrastructure; not relevant to the property registration use case | Out of scope |
| Mobile native app | Web is sufficient for desktop-first property management tasks | Responsive web is acceptable; native app is a future milestone |
| Carbon tracking / compliance reporting | Valuable trend but adds domain complexity; validate core first | Potential v2 differentiator |
| Payment / billing / subscription management | No monetization model defined yet | Defer until business model is clear |

---

## Feature Dependencies

```
User registration → Login → [all other features require authenticated session]

Login
  └── Property registration
        └── GeoJSON upload
              └── Area auto-creation
                    └── Area detail editing
                          └── Category assignment (requires Category management)

Category management (name + color)
  └── Assign category to area
        └── Interactive map (colored areas)
              ├── Map export as image
              └── Map export as PDF

Interactive map
  └── Map zoom-to-property on load
  └── Persistent map state

Property registration
  └── Property summary statistics (area breakdown)
  └── Area summary table
```

---

## MVP Recommendation

Prioritize in this order:

1. Auth (register, login, password reset) — gate to everything
2. Property registration + list — core data entry
3. GeoJSON upload + area auto-creation + area editing — activates the map
4. Category management + area assignment — gives the map meaning
5. Interactive map render — the core deliverable
6. Map export (image + PDF) — completes the user journey

Defer to post-MVP:
- Area summary table: valuable but not blocking the core flow
- Property summary statistics: enhancement; raw fields already exist on the registration form
- Persistent map state: nice-to-have; users can re-navigate
- Color-coded legend on export: recommended for v1.1 — significantly improves export usability

---

## Sources

- Project requirements: `.planning/PROJECT.md`
- GIS property management patterns: [Esri — GIS-Driven Property Management](https://www.esri.com/en-us/industries/blog/articles/gis-driven-property-management)
- Agricultural platform features: [Farmonaut — Top 5 Agriculture Management Systems 2025](https://farmonaut.com/blogs/top-5-agriculture-management-system-software-solutions-2025)
- GeoJSON web mapping: [Leaflet — Using GeoJSON with Leaflet](https://leafletjs.com/examples/geojson/)
- Multi-tenant auth patterns: [Auth0 — Multi-Tenancy in B2B SaaS](https://auth0.com/blog/demystifying-multi-tenancy-in-b2b-saas/)
