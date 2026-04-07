# Requirements: Sistema de Gestão de Propriedades Rurais

**Defined:** 2026-04-07
**Core Value:** O produtor consegue visualizar um mapa personalizado de sua propriedade — com contorno geral e áreas internas coloridas por categoria — gerado a partir de dados georreferenciados importados.

## v1 Requirements

### Autenticação

- [ ] **AUTH-01**: Usuário pode se cadastrar com nome completo, CPF, sexo, email e senha
- [ ] **AUTH-02**: Usuário pode fazer login com email e senha
- [ ] **AUTH-03**: Usuário pode fazer logout de qualquer página
- [ ] **AUTH-04**: Usuário pode redefinir senha via link enviado ao email
- [ ] **AUTH-05**: Sessão do usuário persiste entre atualizações do navegador

### Propriedades

- [ ] **PROP-01**: Usuário pode cadastrar propriedade com nome, município, estado e CEP
- [ ] **PROP-02**: Propriedade armazena áreas em hectares: total, própria, arrendada, protegida e produção vegetal
- [ ] **PROP-03**: Propriedade armazena informação sobre pessoas envolvidas na produção
- [ ] **PROP-04**: Usuário pode ter múltiplas propriedades cadastradas
- [ ] **PROP-05**: Usuário pode editar uma propriedade existente
- [ ] **PROP-06**: Usuário pode excluir uma propriedade
- [ ] **PROP-07**: Usuário vê apenas suas próprias propriedades (isolamento de dados por tenant)

### Importação GeoJSON e Áreas

- [ ] **AREA-01**: Usuário pode fazer upload de arquivo GeoJSON para uma propriedade
- [ ] **AREA-02**: Cada Feature/polígono do GeoJSON importado cria automaticamente uma área
- [ ] **AREA-03**: Usuário pode editar o nome e detalhes de uma área após a importação
- [ ] **AREA-04**: Usuário pode excluir uma área

### Categorias

- [ ] **CAT-01**: Usuário pode criar uma categoria com nome, cor e descrição
- [ ] **CAT-02**: Usuário pode editar uma categoria (nome, cor e/ou descrição)
- [ ] **CAT-03**: Usuário pode excluir uma categoria
- [ ] **CAT-04**: Usuário pode atribuir uma categoria a uma área

### Mapa

- [ ] **MAP-01**: Sistema exibe mapa interativo com contorno da propriedade e áreas internas
- [ ] **MAP-02**: Áreas são exibidas com a cor da categoria atribuída
- [ ] **MAP-03**: Nome de cada área é visível como rótulo no mapa
- [ ] **MAP-04**: Usuário pode exportar o mapa como imagem PNG
- [ ] **MAP-05**: Usuário pode exportar o mapa como PDF

## v2 Requirements

### Mapa — Diferenciadores

- **MAP-V2-01**: Legenda de categorias visível no mapa e nas exportações
- **MAP-V2-02**: Mapa centraliza e ajusta zoom automaticamente para os limites da propriedade ao carregar
- **MAP-V2-03**: Estado do mapa (zoom, posição) persiste entre sessões

### Relatórios

- **REL-V2-01**: Tabela resumo de áreas com nome, categoria e tamanho calculado
- **REL-V2-02**: Painel de estatísticas da propriedade (distribuição de área por categoria)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Desenho/edição de geometrias no sistema | Geometrias vêm do GeoJSON importado; não replicar funcionalidade do app externo de coleta |
| Integração direta com app externo | Importação é manual via upload de arquivo; integração é complexidade desnecessária para v1 |
| Múltiplos usuários por propriedade | v1 é single-user por conta; colaboração/permissões aumenta complexidade significativamente |
| Colaboração em tempo real | Fora do escopo; single-user resolve o caso de uso principal |
| Tiles de satélite pagos | OSM/Stadia gratuitos cobrem o caso de uso; custo não justificado para v1 |
| Planejamento de culturas / IoT / rastreabilidade | Fora do escopo do produto — foco em cadastro e visualização |

## Traceability

*(Preenchido durante criação do roadmap)*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01–05 | Phase 1 | Pending |
| PROP-01–07 | Phase 1 | Pending |
| AREA-01–04 | Phase 2 | Pending |
| CAT-01–04  | Phase 3 | Pending |
| MAP-01–03  | Phase 3 | Pending |
| MAP-04–05  | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after initialization*
