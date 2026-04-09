# Design: Fase 1 — Auth + Propriedades

**Data:** 2026-04-09  
**Fase:** 1 de 4  
**Status:** Aprovado

---

## Objetivo

Produtor autenticado pode cadastrar, editar e excluir suas propriedades rurais com isolamento completo de dados por tenant.

---

## Estrutura do Repositório (Monorepo)

```
GeoMap/
├── frontend/               ← React 19 + Vite 6 + TypeScript 5
│   ├── src/
│   │   ├── pages/          ← Login, Cadastro, Dashboard, Propriedades
│   │   ├── components/     ← componentes reutilizáveis (forms, cards, layout)
│   │   ├── lib/            ← api client, utils
│   │   ├── hooks/          ← useAuth, useProperties
│   │   └── types/          ← TypeScript types (User, Property, GeoJSON)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                ← FastAPI + Python 3.12
│   ├── app/
│   │   ├── auth/           ← register, login, token, reset-password
│   │   ├── properties/     ← CRUD de propriedades
│   │   └── core/           ← database, security, config, deps
│   ├── alembic/            ← migrations
│   ├── requirements.txt
│   └── main.py
│
└── docker-compose.yml      ← PostgreSQL 16 + PostGIS 3
```

---

## Modelos de Banco de Dados

### User
| Campo | Tipo | Observação |
|-------|------|-----------|
| id | UUID, PK | gerado automaticamente |
| name | VARCHAR(200) | nome completo |
| cpf | VARCHAR(14) | formato "XXX.XXX.XXX-XX" |
| sex | ENUM('M','F','O') | |
| email | VARCHAR(200), unique | |
| password | VARCHAR(200) | bcrypt hash via passlib |
| created_at | TIMESTAMP | |

### Property
| Campo | Tipo | Observação |
|-------|------|-----------|
| id | UUID, PK | |
| user_id | UUID, FK → User | isolamento de tenant |
| name | VARCHAR(200) | nome da propriedade |
| location | VARCHAR(300) | endereço textual |
| municipality | VARCHAR(100) | município |
| state | VARCHAR(2) | sigla ex: "SP" |
| zip_code | VARCHAR(9) | formato "XXXXX-XXX" |
| total_area_ha | DECIMAL(12,4) | área total em hectares |
| own_area_ha | DECIMAL(12,4) | área própria |
| leased_area_ha | DECIMAL(12,4) | área arrendada |
| protected_area_ha | DECIMAL(12,4) | área protegida |
| people_count | INTEGER | pessoas na produção |
| crop_area_ha | DECIMAL(12,4) | área de produção vegetal |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

> **Nota:** A extensão PostGIS é ativada no Docker e na migration inicial, mas a coluna `geometry` é adicionada somente na Fase 2 (importação GeoJSON). Isso evita uma migration de infraestrutura entre fases.

---

## Fluxo de Autenticação

**Estratégia:** JWT stateless, token Bearer com expiração de 7 dias. Sem refresh token na Fase 1.

**Armazenamento:** `localStorage` no frontend.

### Endpoints de Auth (`/api/auth/`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /register | Cria usuário e retorna token imediatamente |
| POST | /login | Email + senha, retorna token |
| POST | /reset-password | Recebe email, loga link no servidor (sem email real) |
| POST | /reset-password/confirm | Recebe token + nova senha |
| GET | /me | Retorna dados do usuário logado (requer token) |

### Endpoints de Propriedades (`/api/properties/`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | / | Lista propriedades do usuário logado |
| POST | / | Cria propriedade |
| GET | /:id | Detalhe de uma propriedade |
| PUT | /:id | Edita propriedade |
| DELETE | /:id | Exclui propriedade |

Todos os endpoints filtram por `user_id` extraído do JWT — nunca expõem dados de outros usuários.

### Fluxo no Frontend
- Hook `useAuth` expõe: `user`, `login()`, `logout()`, `register()`
- Rotas protegidas via React Router — redireciona para `/login` se não autenticado
- Interceptor no API client injeta `Authorization: Bearer <token>` em toda requisição

---

## Telas do Frontend

### Páginas de Auth (layout centralizado, sem sidebar)
| Rota | Descrição |
|------|-----------|
| `/login` | Formulário email + senha |
| `/register` | Formulário nome, CPF, sexo, email, senha |
| `/forgot-password` | Formulário email para solicitar reset |
| `/reset-password` | Formulário nova senha (via link com token na URL) |

### Páginas Autenticadas (layout com header)
| Rota | Descrição |
|------|-----------|
| `/dashboard` | Lista de propriedades do usuário |
| `/properties/new` | Formulário de criação de propriedade |
| `/properties/:id` | Detalhe da propriedade |
| `/properties/:id/edit` | Formulário de edição |

### Componentes Compartilhados
| Componente | Uso |
|-----------|-----|
| `AuthLayout` | Wrapper das páginas de auth (centralizado) |
| `AppLayout` | Wrapper das páginas autenticadas (header + main) |
| `PropertyForm` | Formulário reutilizado em `/new` e `/edit` |
| `PropertyCard` | Card da propriedade no dashboard |

---

## Decisões de Desenvolvimento

| Decisão | Escolha |
|---------|---------|
| Estrutura do repositório | Monorepo (frontend/ + backend/) |
| Banco de dados local | Docker Compose (PostgreSQL + PostGIS) |
| Reset de senha | Endpoint implementado, link logado no servidor (sem email) |
| Validação de CPF | Formato apenas (11 dígitos + máscara) |
| Ambiente de desenvolvimento | Serviços independentes (npm run dev + uvicorn) |
| Refresh token | Não na Fase 1 — token com expiração de 7 dias |

---

## Critérios de Sucesso (Fase 1)

1. Usuário pode se cadastrar com nome, CPF, sexo, email e senha — e fazer login imediatamente após
2. Sessão persiste após atualização do navegador; usuário pode fazer logout de qualquer página
3. Usuário pode redefinir senha via link (link aparece no log do servidor em dev)
4. Usuário pode criar, editar e excluir propriedades com todos os campos
5. Usuário autenticado vê apenas suas próprias propriedades
