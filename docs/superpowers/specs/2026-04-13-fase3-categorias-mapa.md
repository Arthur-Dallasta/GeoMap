# Design: Fase 3 — Categorias de Áreas + Mapa Colorido

**Data:** 2026-04-13
**Fase:** 3 de 4
**Status:** Aprovado

---

## Objetivo

Produtor autenticado pode criar categorias por propriedade (nome, cor, descrição) e atribuí-las às áreas internas clicando no mapa. As áreas internas são coloridas pela cor da categoria; o contorno geral permanece verde padrão.

---

## Escopo da Fase 3

- CRUD de categorias por propriedade (nome obrigatório, cor da paleta obrigatória, descrição opcional)
- Atribuição de categoria a áreas internas clicando no mapa (popup Leaflet)
- Remoção de categoria de uma área (área volta ao azul padrão)
- Mapa colorido: áreas internas exibem a cor da categoria atribuída
- Seção "Categorias" abaixo do mapa na página de detalhe da propriedade

**Fora do escopo desta fase:** legenda no mapa, nomes individuais por área, export de mapa.

---

## Modelo de Dados

### Nova tabela `categories`

| Campo | Tipo | Observação |
|-------|------|-----------|
| id | UUID, PK | gerado automaticamente |
| property_id | UUID, FK → properties | `CASCADE DELETE` |
| name | VARCHAR(100) | obrigatório |
| color | VARCHAR(7) | hex da paleta, ex: `#f97316` |
| description | VARCHAR(300) | opcional, nullable |
| created_at | TIMESTAMP | `server_default=func.now()` |

### Alteração na tabela `areas`

Nova coluna:
- `category_id` — UUID, FK → categories, **nullable**, `ON DELETE SET NULL`

Quando uma categoria é excluída, as áreas que a usavam recebem `category_id = NULL` e voltam para a cor padrão azul no mapa.

### Paleta de cores predefinida (12 cores)

```
#ef4444  #f97316  #eab308  #22c55e
#14b8a6  #3b82f6  #6366f1  #a855f7
#ec4899  #f43f5e  #84cc16  #06b6d4
```

---

## Backend

### Novos arquivos

```
backend/app/categories/
├── __init__.py
├── models.py       ← model Category (SQLAlchemy)
├── schemas.py      ← CategoryCreate, CategoryUpdate, CategoryResponse
├── service.py      ← create, list, update, delete
└── router.py       ← endpoints montados em /api/properties/{id}/categories
```

### Endpoints de categorias

Todos verificam que `property_id` pertence ao usuário autenticado.

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/properties/{property_id}/categories/` | Criar categoria |
| GET | `/api/properties/{property_id}/categories/` | Listar categorias |
| PUT | `/api/properties/{property_id}/categories/{cat_id}` | Editar categoria |
| DELETE | `/api/properties/{property_id}/categories/{cat_id}` | Excluir categoria |

### Endpoint para atribuição de categoria a uma área

| Método | Rota | Body | Descrição |
|--------|------|------|-----------|
| PATCH | `/api/properties/{property_id}/areas/{area_id}` | `{ "category_id": "uuid" \| null }` | Atribui ou remove categoria da área |

Validação: se `category_id` não for null, verificar que a categoria pertence à mesma `property_id`.

### Alteração no GET `/api/properties/{property_id}/areas/`

`AreaFeature.properties` passa a incluir dois campos adicionais (nullable):
```json
{
  "id": "uuid",
  "type": "internal",
  "category_id": "uuid | null",
  "category_color": "#f97316 | null"
}
```

Isso evita uma segunda requisição no frontend para obter as cores.

### Schemas

**CategoryCreate / CategoryUpdate:**
```python
class CategoryCreate(BaseModel):
    name: str
    color: str      # deve ser um dos 12 valores da paleta
    description: str | None = None

class CategoryUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    description: str | None = None

class CategoryResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    name: str
    color: str
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
```

**AreaAssignRequest:**
```python
class AreaAssignRequest(BaseModel):
    category_id: uuid.UUID | None
```

### Erros de validação

| Condição | HTTP | Mensagem |
|----------|------|---------|
| `color` não está na paleta | 400 | `Invalid color` |
| `category_id` não pertence à propriedade | 400 | `Category does not belong to this property` |
| `property_id` não pertence ao usuário | 403 | `Forbidden` |
| Categoria não encontrada | 404 | `Category not found` |

---

## Frontend

### Alterações na página `/properties/:id`

A página de detalhe recebe, abaixo do `PropertyMap` existente, o novo componente `CategoryManager`.

```
frontend/src/
├── components/
│   ├── CategoryManager.tsx   ← seção de lista + botão "Nova categoria"
│   └── CategoryModal.tsx     ← modal criar/editar (nome, cor, descrição)
├── hooks/
│   └── useCategories.tsx     ← fetch, create, update, delete, assignToArea
└── lib/
    └── api.ts                ← +getCategories, +createCategory, +updateCategory,
                                 +deleteCategory, +assignCategory
```

### PropertyMap (atualizado)

- Áreas internas: cor determinada por `feature.properties.category_color` se presente; fallback `#60a5fa` / `#1e40af` se `null`
- Contorno geral: sempre `#4ade80` / `#2d7a4f` (sem mudança)
- Clique numa área interna abre popup Leaflet com:
  - Lista de categorias da propriedade (swatch de cor + nome, em grid)
  - Botão "Remover categoria" se a área já tiver uma atribuída
  - Clicar numa categoria faz PATCH → fecha popup → atualiza mapa
- O `PropertyMap` recebe nova prop `categories` e `onAssignCategory(areaId, categoryId | null)`

### CategoryManager

- Seção abaixo do mapa com título "Categorias"
- Lista as categorias com: swatch de cor, nome, descrição (se houver), botões Editar e Excluir
- Botão "Nova categoria" abre `CategoryModal` em modo criação
- Ao excluir: confirmação simples (`window.confirm`)
- Estado vazio: texto "Nenhuma categoria cadastrada"

### CategoryModal

- Modal com campos: nome (obrigatório), descrição (opcional), seletor de cor
- Seletor de cor: grid 4×3 de círculos coloridos clicáveis (paleta de 12 cores)
- Cor selecionada tem borda de destaque
- Botão "Salvar" / "Cancelar"
- Usado para criação e edição (mesma lógica, título diferente)

### useCategories

```typescript
const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories(propertyId)
```

### Tipos TypeScript atualizados

```typescript
// Acrescentar em types/index.ts
export interface Category {
  id: string;
  property_id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

// AreaProperties atualizado (category_id e category_color opcionais):
export interface AreaProperties {
  id: string;
  type: "boundary" | "internal";
  category_id: string | null;
  category_color: string | null;
}
```

---

## Testes

### Backend (`tests/test_categories.py`)

- Criar categoria retorna 201 com dados corretos
- Listar categorias retorna apenas as da propriedade do usuário logado
- Editar categoria atualiza nome/cor/descrição
- Excluir categoria: áreas com essa categoria ficam com `category_id = null`
- Criar com cor inválida retorna 400
- PATCH area com `category_id` válido atribui corretamente
- PATCH area com `category_id = null` remove a atribuição
- PATCH area com categoria de outra propriedade retorna 400
- Acesso a categorias de propriedade de outro usuário retorna 403

### Frontend (`tests/PropertyMap.test.tsx` atualizado)

- Área interna sem categoria renderiza com cor padrão (`#60a5fa`)
- Área interna com `category_color` renderiza com a cor da categoria

---

## Dependências novas

Nenhuma dependência nova — usa o que já está instalado.

---

## Critérios de Sucesso

1. Produtor pode criar, editar e excluir categorias para uma propriedade
2. Clicar numa área interna no mapa abre popup com as categorias disponíveis
3. Selecionar uma categoria colore a área com a cor escolhida
4. Remover a categoria volta a área para o azul padrão
5. Excluir uma categoria remove automaticamente a atribuição de todas as áreas
6. Categorias de outras propriedades/usuários nunca são acessíveis
