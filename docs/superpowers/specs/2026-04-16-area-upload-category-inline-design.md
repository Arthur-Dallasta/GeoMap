# Design: Categoria inline no modal de import de área

**Data:** 2026-04-16  
**Status:** Aprovado

## Objetivo

Ao importar um GeoJSON de área interna, o usuário define a categoria no mesmo modal de upload. A categoria é obrigatória para áreas internas e atribuída automaticamente ao polígono criado. Contornos gerais não recebem categoria.

## Comportamento do modal

- O `AreaUploadModal` mantém o seletor de tipo atual (Contorno geral / Área interna).
- Quando o tipo é **Área interna**, uma seção de categoria aparece abaixo da drop zone:
  - Um `<select>` lista as categorias existentes da propriedade, cada uma com indicador de cor.
  - O último item do select é `"+ Nova categoria..."`.
  - Se o usuário escolher "Nova categoria...", campos inline aparecem abaixo do select: nome (obrigatório), paleta de cor, descrição (opcional).
  - A categoria é obrigatória: o botão "Fazer upload" permanece desabilitado até que arquivo e categoria estejam definidos.
- Quando o tipo é **Contorno geral**, a seção de categoria não é exibida.

## Fluxo de dados ao submeter

1. Se modo "Nova categoria": chama `onCreateCategory(data)` → recebe o `id` da categoria criada.
2. Chama `onUpload(file, "internal", categoryId)` com o `categoryId` já resolvido.
3. `uploadArea` (em `useAreas`) faz o upload do GeoJSON e em seguida chama `PATCH /properties/{propertyId}/areas/{areaId}` para atribuir a categoria.

Nenhum endpoint novo é necessário no backend.

## Mudanças por arquivo

### `AreaUploadModal.tsx`
- Novas props: `categories: Category[]`, `onCreateCategory: (data: CategoryCreate) => Promise<Category>`
- A prop `onUpload` passa a aceitar `categoryId?: string` como terceiro argumento: `(file, type, categoryId?) => Promise<void>`
- Novo estado local: `selectedCategoryId: string` (valor do select), campos do form inline (nome, cor, descrição)
- Renderização condicional da seção de categoria quando `areaType === "internal"`
- Antes de chamar `onUpload`, se `selectedCategoryId === "new"`: chama `onCreateCategory` e usa o id retornado

### `useAreas.tsx`
- `uploadArea` aceita terceiro argumento `categoryId?: string`
- Após o upload, se `categoryId` fornecido: chama `api.patch` para atribuir a categoria à área recém-criada
- Chama `fetchAreas()` ao final

### `PropertyDetail.tsx`
- Passa `categories` e `createCategory` para `AreaUploadModal` (ambos já disponíveis via `useCategories`)

## O que não muda

- `CategoryModal.tsx` — não alterado; continua sendo usado pelo `CategoryManager` para criar/editar categorias avulsas
- Backend — nenhum endpoint novo; usa o PATCH de assign já existente
- Fluxo de contorno geral — idêntico ao atual
