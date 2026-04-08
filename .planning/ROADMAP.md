# Roadmap: Sistema de Gestão de Propriedades Rurais

## Overview

Four phases deliver the full v1 product: authentication and property management gate all other work; GeoJSON import activates the area data model; map rendering with categories delivers the core visual value; and PNG/PDF export closes the product loop. Each phase is independently verifiable.

## Phases

- [ ] **Phase 1: Auth + Propriedades** - Usuário autenticado pode cadastrar, editar e excluir suas propriedades com isolamento por tenant
- [ ] **Phase 2: Importação GeoJSON + Áreas** - Usuário pode importar GeoJSON e gerenciar as áreas resultantes
- [ ] **Phase 3: Categorias + Mapa Interativo** - Usuário pode categorizar áreas e visualizar mapa colorido da propriedade
- [ ] **Phase 4: Exportação do Mapa** - Usuário pode exportar o mapa como PNG e PDF

## Phase Details

### Phase 1: Auth + Propriedades
**Goal**: Produtor autenticado pode gerenciar suas propriedades rurais com segurança e isolamento de dados
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, PROP-06, PROP-07
**Tech**: React SPA (Vite) + FastAPI (JWT) + SQLAlchemy + PostgreSQL + PostGIS
**Success Criteria** (what must be TRUE):
  1. Usuário pode se cadastrar com nome, CPF, sexo, email e senha, e fazer login imediatamente após
  2. Sessão persiste após atualização do navegador; usuário pode fazer logout de qualquer página
  3. Usuário pode redefinir senha via link enviado ao email
  4. Usuário pode criar, editar e excluir propriedades com todos os campos (localização, áreas em ha, pessoas)
  5. Usuário autenticado vê apenas suas próprias propriedades; dados de outros produtores são inacessíveis
**Plans**: TBD
**UI hint**: yes

### Phase 2: Importação GeoJSON + Áreas
**Goal**: Produtor pode importar arquivo GeoJSON para uma propriedade e gerenciar as áreas resultantes
**Depends on**: Phase 1
**Requirements**: AREA-01, AREA-02, AREA-03, AREA-04
**Tech**: FastAPI UploadFile + GDAL/OGR + Shapely + GeoAlchemy2 (PostGIS geometry)
**Success Criteria** (what must be TRUE):
  1. Usuário pode fazer upload de um arquivo GeoJSON válido vinculado a uma propriedade
  2. Cada Feature/polígono do GeoJSON importado aparece automaticamente como uma área listada
  3. Usuário pode editar nome e detalhes de uma área após a importação
  4. Usuário pode excluir uma área individualmente
**Plans**: TBD
**UI hint**: yes

### Phase 3: Categorias + Mapa Interativo
**Goal**: Produtor pode categorizar áreas e visualizar um mapa interativo personalizado da propriedade
**Depends on**: Phase 2
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, MAP-01, MAP-02, MAP-03
**Tech**: React Leaflet + Turf.js (client) + PostGIS ST_AsGeoJSON (server)
**Success Criteria** (what must be TRUE):
  1. Usuário pode criar, editar e excluir categorias com nome e cor personalizados
  2. Usuário pode atribuir uma categoria a qualquer área de uma propriedade
  3. Mapa exibe o contorno geral da propriedade e os polígonos das áreas internas
  4. Cada área aparece colorida com a cor da categoria atribuída e com seu nome como rótulo visível
**Plans**: TBD
**UI hint**: yes

### Phase 4: Exportação do Mapa
**Goal**: Produtor pode exportar o mapa personalizado como imagem PNG ou documento PDF
**Depends on**: Phase 3
**Requirements**: MAP-04, MAP-05
**Tech**: leaflet-image + jsPDF (client-side)
**Success Criteria** (what must be TRUE):
  1. Usuário pode baixar o mapa atual como arquivo PNG com as áreas coloridas e rotuladas
  2. Usuário pode baixar o mapa atual como arquivo PDF com as áreas coloridas e rotuladas
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth + Propriedades | 0/? | Not started | - |
| 2. Importação GeoJSON + Áreas | 0/? | Not started | - |
| 3. Categorias + Mapa Interativo | 0/? | Not started | - |
| 4. Exportação do Mapa | 0/? | Not started | - |
