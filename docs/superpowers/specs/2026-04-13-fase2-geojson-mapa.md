# Design: Fase 2 — Importação GeoJSON + Mapa

**Data:** 2026-04-13
**Fase:** 2 de 4
**Status:** Aprovado

---

## Objetivo

Produtor autenticado pode fazer upload de arquivos GeoJSON para suas propriedades e visualizar as áreas georreferenciadas num mapa interativo embutido na página de detalhe.

---

## Escopo da Fase 2

- Upload de arquivos GeoJSON (um arquivo por vez, uma Feature por arquivo)
- Persistência das geometrias no PostGIS via GeoAlchemy2
- Visualização no mapa Leaflet (sem categorias ou cores personalizadas — isso é Fase 3)
- Remoção individual de áreas

**Fora do escopo desta fase:** nomes de áreas, categorias, cores personalizadas, export de mapa.

---

## Modelo de Dados

Nova tabela `areas`:

| Campo | Tipo | Observação |
|-------|------|-----------|
| id | UUID, PK | gerado automaticamente |
| property_id | UUID, FK → properties | `CASCADE DELETE` |
| type | VARCHAR(10) | `"boundary"` ou `"internal"` |
| geometry | `Geometry(geometry_type="GEOMETRY", srid=4326)` | PostGIS via GeoAlchemy2 — aceita Polygon e MultiPolygon |
| created_at | TIMESTAMP | `server_default=func.now()` |

**Regra do contorno único:** ao receber upload com `type="boundary"`, o service deleta qualquer area anterior com `type="boundary"` para aquela propriedade antes de inserir a nova.

**Migration:** ativa `CREATE EXTENSION IF NOT EXISTS postgis` e cria a tabela `areas`.

---

## Backend

### Novos arquivos

```
backend/app/areas/
├── __init__.py
├── models.py       ← model Area (SQLAlchemy + GeoAlchemy2)
├── schemas.py      ← AreaResponse, AreaListResponse
├── service.py      ← upload, list, delete
└── router.py       ← endpoints montados em /api/properties/{id}/areas
```

### Endpoints

Todos os endpoints verificam que `property_id` pertence ao usuário autenticado (tenant isolation).

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/properties/{property_id}/areas/` | Upload de GeoJSON |
| GET | `/api/properties/{property_id}/areas/` | Lista áreas da propriedade |
| DELETE | `/api/properties/{property_id}/areas/{area_id}` | Remove uma área |

### Fluxo do upload (POST)

Request: `multipart/form-data` com campos:
- `file`: arquivo `.geojson`
- `type`: `"boundary"` ou `"internal"`

Processamento:
1. Valida `type` ∈ `{"boundary", "internal"}`
2. Lê e parseia o arquivo como JSON
3. Valida que é uma GeoJSON `Feature` com `geometry.type` ∈ `{"Polygon", "MultiPolygon"}`
4. Usa Shapely para validar geometria (`shape.is_valid`)
5. Se `type == "boundary"`: deleta area anterior com esse tipo para a propriedade
6. Salva no PostGIS via GeoAlchemy2 com `shape()` do Shapely → WKT

Resposta: `201 Created` com `AreaResponse`.

### Resposta do GET `/areas/`

```json
{
  "boundary": {
    "type": "Feature",
    "geometry": { ... },
    "properties": { "id": "uuid", "type": "boundary" }
  },
  "internal": [
    {
      "type": "Feature",
      "geometry": { ... },
      "properties": { "id": "uuid", "type": "internal" }
    }
  ]
}
```

`boundary` é `null` se nenhum contorno foi enviado ainda.

### Erros de validação

| Condição | HTTP | Mensagem |
|----------|------|---------|
| Arquivo não é JSON válido | 400 | `Invalid GeoJSON file` |
| Geometry type inválido | 400 | `Geometry must be Polygon or MultiPolygon` |
| Geometria inválida (Shapely) | 400 | `Invalid geometry` |
| `property_id` não pertence ao usuário | 403 | `Forbidden` |
| Arquivo maior que 5MB | 413 | `File too large` |

---

## Frontend

### Alterações na página `/properties/:id`

A página de detalhe existente (`PropertyDetail.tsx`) recebe um novo componente `PropertyMap` inserido abaixo dos dados da propriedade.

```
frontend/src/
├── components/
│   ├── PropertyMap.tsx        ← mapa Leaflet + botão "+" flutuante
│   └── AreaUploadModal.tsx    ← modal com seletor de tipo + file input
├── hooks/
│   └── useAreas.tsx           ← fetch, upload, delete de áreas
└── lib/
    └── api.ts                 ← +getAreas, +uploadArea, +deleteArea
```

### PropertyMap

- Mapa Leaflet com `aspect-ratio: 4/3`, responsivo à largura do container
- Renderiza contorno geral em verde (`#4ade80`, `fillColor: #2d7a4f`)
- Renderiza áreas internas em azul (`#60a5fa`, `fillColor: #1e40af`)
- Fitbounds automático para as geometrias presentes
- Estado vazio: placeholder com texto "Nenhuma área cadastrada"
- Botão "+" flutuante no canto inferior direito (abre `AreaUploadModal`)

### AreaUploadModal

- Seletor visual de tipo: "Contorno geral" | "Área interna" (botões toggle)
- Drag-and-drop + clique para selecionar arquivo `.geojson`
- Aviso ao selecionar `type=boundary` se já existe um contorno: "Isso substituirá o contorno atual"
- Loading state durante upload
- Fecha e recarrega mapa após sucesso

### useAreas

```typescript
const { boundary, internal, loading, uploadArea, deleteArea } = useAreas(propertyId)
```

Estado local: busca áreas ao montar, atualiza após upload/delete.

---

## Testes

### Backend (`tests/test_areas.py`)

- Upload com `type=boundary` cria área e retorna 201
- Segundo upload com `type=boundary` substitui o anterior (apenas 1 boundary por property)
- Upload com `type=internal` acumula múltiplas áreas
- Upload com GeoJSON inválido retorna 400
- DELETE remove a área correta
- GET retorna apenas áreas da propriedade do usuário logado
- Acesso a property de outro usuário retorna 403

### Frontend (`tests/PropertyMap.test.tsx`)

- Renderiza placeholder quando não há areas
- Renderiza mapa quando há areas
- Modal abre ao clicar no "+"
- Seleção de tipo (boundary/internal) funciona
- Aviso de substituição aparece ao selecionar boundary com contorno existente

---

## Dependências novas

### Backend
- `GeoAlchemy2>=0.15` — tipos Geometry no SQLAlchemy
- `Shapely>=2.0` — validação e manipulação de geometrias

### Frontend
- `leaflet` + `react-leaflet` — mapa interativo
- `@types/leaflet` — tipos TypeScript

---

## Critérios de Sucesso

1. Produtor pode fazer upload de um arquivo GeoJSON como contorno geral da propriedade
2. Segundo upload de contorno substitui o anterior automaticamente
3. Produtor pode fazer upload de múltiplas áreas internas
4. Todas as áreas aparecem no mapa na página de detalhe da propriedade
5. Produtor pode remover uma área individual
6. Dados de outros usuários nunca são acessíveis
