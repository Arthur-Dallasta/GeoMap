---
phase: 1
slug: auth-propriedades
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-07
---

# Phase 1 — UI Design Contract: Auth + Propriedades

> Contrato visual e de interação para a Fase 1. Gerado por gsd-ui-researcher.
> Todo o texto de interface deve estar em pt-BR.

---

## Design System

| Propriedade | Valor |
|-------------|-------|
| Tool | shadcn/ui (a inicializar com `npx shadcn@latest init` antes da Wave 0) |
| Preset | nenhum preset remoto — usar configuração padrão do CLI |
| Component library | Radix UI (via shadcn) |
| Icon library | lucide-react (bundled com shadcn) |
| Font | Inter (padrão Next.js + Tailwind) — sem importação adicional necessária |

**Componentes shadcn a adicionar na Wave 0:**

```bash
npx shadcn@latest add button input label form card toast select dialog
```

Fonte: STACK.md + RESEARCH.md — stack já decidido.

---

## Spacing Scale

Valores declarados (múltiplos de 4 — escala Tailwind padrão):

| Token | Valor | Uso |
|-------|-------|-----|
| xs | 4px (`gap-1`) | Espaço entre ícone e label em botão |
| sm | 8px (`gap-2`, `p-2`) | Padding interno de badge, espaço entre campos inline |
| md | 16px (`gap-4`, `p-4`) | Espaçamento padrão entre campos de formulário |
| lg | 24px (`gap-6`, `p-6`) | Padding interno de Card |
| xl | 32px (`gap-8`, `p-8`) | Separação entre seções do formulário de propriedade |
| 2xl | 48px (`py-12`) | Padding vertical do layout de auth (tela centralizada) |
| 3xl | 64px (`py-16`) | Padding vertical do layout de dashboard |

Exceções:
- Touch targets de botões de ação destrutiva: mínimo 44px de altura (`min-h-[44px]`)
- Input de formulário: altura 40px (`h-10`) — padrão shadcn

---

## Typography

| Papel | Tamanho | Peso | Line Height | Classe Tailwind |
|-------|---------|------|-------------|-----------------|
| Body | 16px | 400 (regular) | 1.5 | `text-base font-normal leading-normal` |
| Label | 14px | 500 (medium) | 1.4 | `text-sm font-medium leading-snug` |
| Heading | 24px | 600 (semibold) | 1.2 | `text-2xl font-semibold leading-tight` |
| Display | 30px | 700 (bold) | 1.2 | `text-3xl font-bold leading-tight` |

Regras:
- Apenas 2 pesos em uso: 400 (body, placeholder) e 600 (headings, labels de campo, botão primário)
- Peso 500 exclusivo para labels de formulário — não usar em outros contextos
- Peso 700 exclusivo para o Display (título da página de auth)
- Tamanho mínimo de texto legível: 14px — nunca abaixo de `text-sm`

---

## Color

Paleta neutra com acento verde-escuro (contexto agrícola/rural).

| Papel | Valor HSL | Tailwind token | Uso |
|-------|-----------|----------------|-----|
| Dominant (60%) | hsl(0 0% 100%) / hsl(240 10% 97%) | `background` / `muted` | Fundo de página, fundo de inputs |
| Secondary (30%) | hsl(0 0% 96%) | `card` | Cards de formulário, sidebar futura, cabeçalho de lista |
| Accent (10%) | hsl(142 71% 29%) | `primary` (customizar) | Ver lista abaixo |
| Destructive | hsl(0 72% 51%) | `destructive` | Exclusivamente: botão "Excluir propriedade", texto de erro de validação |

**Accent reservado exclusivamente para:**
1. Botão primário de submit (Cadastrar / Entrar / Salvar propriedade)
2. Link "Esqueci a senha" na tela de login
3. Indicador de foco de input (ring de foco — `ring-primary`)
4. Nenhum outro uso

**Modo escuro:** não implementar na Fase 1. Apenas modo claro.

Configuração em `tailwind.config` / `globals.css` (CSS variables shadcn):

```css
:root {
  --primary: 142 71% 29%;        /* verde rural */
  --primary-foreground: 0 0% 98%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 98%;
}
```

---

## Layouts de Tela

### Telas de Auth (login, registro, reset de senha)

- Layout: coluna centralizada, largura máxima 400px, `mx-auto` vertical e horizontal
- Fundo: `bg-muted` (cinza levíssimo) para a página inteira
- Card central: `bg-card shadow-sm rounded-lg p-6`
- Logo/título acima do card: Display (30px bold) + subtítulo Body (16px regular)
- Separação entre grupos de campos: 16px (`gap-4`)
- Botão de submit: largura total (`w-full`), altura 40px, `bg-primary text-primary-foreground`

### Dashboard — Lista de Propriedades

- Layout: sidebar fixa 240px (futura) + área de conteúdo principal
- Na Fase 1: sem sidebar — layout de página simples com `max-w-4xl mx-auto px-6 py-8`
- Cabeçalho da página: Heading (24px semibold) à esquerda + botão "Nova Propriedade" à direita
- Lista de propriedades: cards em grade responsiva `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- Card de propriedade: `rounded-lg border bg-card p-4 shadow-sm`

### Formulário de Propriedade (criar/editar)

- Layout: `max-w-2xl mx-auto px-6 py-8`
- Campos organizados em seções com heading (Label 14px medium) acima de cada grupo:
  - "Identificação" (nome)
  - "Localização" (município, estado, CEP)
  - "Áreas (hectares)" (5 campos numéricos em grade 2 colunas)
  - "Produção" (pessoas envolvidas)
- Grade de campos de área: `grid grid-cols-2 gap-4`
- Botões de ação: alinhados à direita — "Cancelar" (variant ghost) + "Salvar" (variant default/primary)

---

## Componentes Mapeados por Tela

### Tela de Registro (AUTH-01)

| Campo | Componente | Tipo | Validação visível |
|-------|-----------|------|-------------------|
| Nome completo | Input | text | Obrigatório — "Nome completo é obrigatório" |
| CPF | Input | text | Máscara 999.999.999-99, dígito verificador — "CPF inválido" |
| Sexo | Select | enum | Opções: "Masculino", "Feminino", "Outro" |
| Email | Input | email | Formato — "Email inválido" |
| Senha | Input | password | Mínimo 8 caracteres — "Senha deve ter ao menos 8 caracteres" |

### Tela de Login (AUTH-02)

| Campo | Componente |
|-------|-----------|
| Email | Input (type email) |
| Senha | Input (type password) |
| Link "Esqueci a senha" | anchor color primary, abaixo do campo senha |

### Tela de Reset de Senha (AUTH-04)

Passo 1 — Solicitar link:
- Input de email + botão "Enviar link"

Passo 2 — Nova senha (via link do email):
- Input nova senha + Input confirmar senha + botão "Redefinir senha"

### Card de Propriedade (PROP-04)

Exibe: nome (Heading 20px), município + estado (Body 14px muted), área total em ha (Label).
Ações inline: ícone de edição (lápis) + ícone de exclusão (lixeira) no canto superior direito do card.

### Formulário de Propriedade (PROP-01, PROP-02, PROP-03)

Campos de área em hectares — todos opcionais, `type="number"` com `step="0.01"` e `min="0"`.

| Campo pt-BR | Nome no modelo | Obrigatório |
|-------------|---------------|-------------|
| Nome da propriedade | name | Sim |
| Município | municipio | Sim |
| Estado | estado | Sim — Select com 27 UFs |
| CEP | cep | Sim — formato 99999-999 |
| Área total (ha) | totalArea | Não |
| Área própria (ha) | ownedArea | Não |
| Área arrendada (ha) | leasedArea | Não |
| Área protegida (ha) | protectedArea | Não |
| Área de produção vegetal (ha) | vegetableArea | Não |
| Pessoas envolvidas | peopleCount | Não — `type="number"` inteiro ≥ 0 |

Estado (UF): `<Select>` com lista fixa das 27 siglas — não input livre.
Fonte: RESEARCH.md questão em aberto #3 — recomendação select.

---

## Copywriting Contract

Todos os textos em pt-BR. Nenhum texto em inglês visível ao usuário.

| Elemento | Cópia |
|----------|-------|
| CTA primário — registro | "Criar conta" |
| CTA primário — login | "Entrar" |
| CTA primário — criar propriedade | "Salvar propriedade" |
| CTA primário — reset (passo 1) | "Enviar link de redefinição" |
| CTA primário — reset (passo 2) | "Redefinir senha" |
| CTA — nova propriedade (lista) | "Nova propriedade" |
| Estado vazio — título | "Nenhuma propriedade cadastrada" |
| Estado vazio — corpo | "Adicione sua primeira propriedade para começar a gerenciar suas áreas rurais." |
| Estado vazio — ação | Botão "Nova propriedade" (mesmo CTA da lista) |
| Erro de validação genérico | "Verifique os campos destacados e tente novamente." |
| Erro — CPF já cadastrado | "Este CPF já está associado a uma conta. Faça login ou use outro CPF." |
| Erro — email já cadastrado | "Este email já está em uso. Faça login ou use outro email." |
| Erro — credenciais inválidas (login) | "Email ou senha incorretos. Verifique seus dados e tente novamente." |
| Erro — link de reset expirado | "O link de redefinição expirou. Solicite um novo link." |
| Erro — servidor (500 genérico) | "Ocorreu um erro inesperado. Tente novamente em alguns instantes." |
| Confirmação de exclusão — título | "Excluir propriedade?" |
| Confirmação de exclusão — corpo | "Esta ação não pode ser desfeita. A propriedade '{nome}' e todos os seus dados serão excluídos permanentemente." |
| Confirmação de exclusão — CTA | "Excluir" (variant destructive) |
| Cancelar exclusão | "Cancelar" (variant ghost) |
| Logout | "Sair" (no menu de usuário) |
| Toast — propriedade criada | "Propriedade cadastrada com sucesso." |
| Toast — propriedade atualizada | "Propriedade atualizada com sucesso." |
| Toast — propriedade excluída | "Propriedade excluída." |
| Toast — link de reset enviado | "Link enviado. Verifique seu email." |

---

## Interaction Contracts

### Feedback de formulário

- Erros de validação: exibidos abaixo do campo com `text-sm text-destructive`, ícone de alerta (lucide `AlertCircle` 16px)
- Validação: ao submit (não ao blur) — exceto CPF que valida ao blur após o campo perder foco
- Campo com erro: `border-destructive ring-destructive` via shadcn `FormMessage`
- Botão de submit: estado `loading` com spinner (`Loader2` lucide, `animate-spin`) durante requisição — desabilitar o botão

### Confirmação de exclusão

- Mecanismo: `Dialog` shadcn (modal) — não inline
- Trigger: clique no ícone de lixeira no card de propriedade
- Foco: ao abrir o Dialog, foco vai para o botão "Cancelar" (não "Excluir") — padrão de segurança
- Fechamento: tecla Esc ou botão "Cancelar"

### Toast de feedback

- Posição: `bottom-right`
- Duração: 4000ms (4 segundos)
- Componente: shadcn `Toaster` com `useToast`

### Navegação pós-ação

- Login bem-sucedido → redireciona para `/properties`
- Registro bem-sucedido → redireciona para `/properties`
- Criar propriedade → redireciona para `/properties` (lista) com toast de sucesso
- Editar propriedade → redireciona para `/properties` (lista) com toast de sucesso
- Excluir propriedade → permanece na lista, remove card com toast de confirmação
- Logout → redireciona para `/login`
- Usuário não autenticado → middleware redireciona para `/login`

---

## Acessibilidade

- Todos os inputs têm `<Label>` associado via `htmlFor` / `id`
- Botões com apenas ícone (editar/excluir no card) têm `aria-label` descritivo: "Editar [nome da propriedade]", "Excluir [nome da propriedade]"
- Dialog de confirmação: `role="dialog"` + `aria-labelledby` (título) + `aria-describedby` (corpo) — shadcn implementa automaticamente
- Contraste mínimo: 4.5:1 para texto body, 3:1 para elementos grandes — verde `hsl(142 71% 29%)` sobre branco atende WCAG AA
- Foco visível: não remover `outline` — usar `ring` do shadcn

---

## Registry Safety

| Registry | Blocos usados | Safety Gate |
|----------|--------------|-------------|
| shadcn oficial | button, input, label, form, card, toast, select, dialog | não requerido |

Nenhum registry de terceiros declarado. Gate não aplicável.

---

## Sourcing das Decisões

| Fonte | Decisões extraídas |
|-------|--------------------|
| STACK.md | shadcn/ui, Tailwind CSS 4.x, lucide-react, react-hook-form, zod |
| RESEARCH.md (01-RESEARCH.md) | Componentes shadcn específicos, estado (UF) como select, CPF normalizado para dígitos, estrutura de rotas |
| REQUIREMENTS.md | Todos os campos de formulário (AUTH-01 a PROP-03), fluxos de exclusão e edição |
| Padrão do domínio | Cor accent verde (contexto agro), textos em pt-BR, confirmação de exclusão via Dialog |
| Defaults do designer | Escala de spacing 8-point, tipografia Inter, paleta neutra |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Aprovação:** pendente

---

*Gerado em: 2026-04-07*
*Próximo passo: executar `npx shadcn@latest init` antes da Wave 0*
