# Sistema de Gestão de Propriedades Rurais

## What This Is

Sistema web para cadastro e gestão de propriedades rurais. Produtores rurais registram suas propriedades com dados detalhados, importam dados georreferenciados (GeoJSON) coletados por aplicativo externo, e visualizam um mapa interativo personalizado com as áreas da propriedade identificadas e categorizadas. Cada área pode receber uma categoria criada pelo próprio usuário (com nome e cor), tornando o mapa visual e informativo.

## Core Value

O produtor consegue visualizar um mapa personalizado de sua propriedade — com contorno geral e áreas internas coloridas por categoria — gerado a partir de dados georreferenciados importados.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Produtor pode se cadastrar com nome completo, CPF, sexo, email e senha
- [ ] Produtor pode fazer login com email e senha
- [ ] Produtor pode cadastrar propriedades com: nome, localização, município, estado, CEP, área total (ha), área própria (ha), área arrendada (ha), área protegida (ha), pessoas envolvidas na produção e área de produção vegetal (ha)
- [ ] Produtor pode importar arquivo GeoJSON para uma propriedade
- [ ] Após importação, cada polígono/feature do GeoJSON vira uma área automaticamente, e o produtor pode editar nome e detalhes de cada área
- [ ] Produtor pode criar categorias com nome e cor
- [ ] Produtor pode atribuir uma categoria a uma área
- [ ] O sistema exibe mapa interativo da propriedade com: contorno geral, áreas coloridas pela categoria atribuída e nome de cada área
- [ ] Produtor pode exportar o mapa como imagem ou PDF
- [ ] Cada produtor acessa apenas suas próprias propriedades (isolamento de dados)

### Out of Scope

- Edição geométrica das áreas no mapa — geometrias vêm do GeoJSON importado; não há desenho livre no sistema
- Integração direta com o app externo de coleta — a importação é manual via upload de arquivo
- Gestão de múltiplos usuários por propriedade (ex: técnicos + produtor) — v1 é single-user por conta

## Context

- O sistema é multi-tenant: cada produtor tem sua conta e vê apenas suas propriedades
- Os dados georreferenciados são coletados externamente (app não especificado) e exportados em GeoJSON para upload no sistema
- A hierarquia de dados é de dois níveis: Propriedade → Áreas
- Categorias são livres (o usuário define o que representam — cultura, uso do solo, etc.) e possuem nome e cor
- O mapa personalizado é o principal entregável visual do sistema

## Constraints

- **Formato de importação**: GeoJSON — formato padrão definido pelo app externo de coleta
- **Hierarquia**: Dois níveis (Propriedade → Áreas) — estrutura suficiente para o caso de uso atual
- **Arquitetura**: Frontend React (SPA) + Backend FastAPI (Python) — dois serviços independentes
- **Comunicação**: REST API com CORS entre frontend e backend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React SPA + FastAPI (Python) | Python tem ecossistema geoespacial nativo (GDAL, Shapely); FastAPI oferece tipagem forte e docs automáticas; separação permite deploy independente | — Pending |
| JWT para autenticação | Stateless, compatível com SPA + API separada; padrão FastAPI com OAuth2PasswordBearer | — Pending |
| SQLAlchemy + GeoAlchemy2 | Tipagem nativa para PostGIS (geometry type); Prisma suporta PostGIS apenas via raw SQL/Unsupported | — Pending |
| FastAPI UploadFile para GeoJSON | Nativo do FastAPI com streaming e validação; Multer é incompatível com Python | — Pending |
| PostGIS ativo desde v1 | GeoAlchemy2 + GDAL permitem validar e processar geometrias server-side; armazenamento como `geometry` é future-proof | — Pending |
| GeoJSON como formato de importação | Formato padrão web para geodados, produzido pelo app externo | — Pending |
| Categorias livres (nome + cor) | Produtores usam para culturas, tipos de uso ou qualquer classificação — flexibilidade é o valor | — Pending |
| Mapa interativo + exportação | Interativo para navegação no sistema; exportação para relatórios/impressão | — Pending |
| Sem edição geométrica no sistema | Geometrias vêm do GeoJSON — simplifica v1 e evita replicar funcionalidade do app de coleta | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-07 — Stack migrado para React + FastAPI (Python) + SQLAlchemy + PostGIS*
