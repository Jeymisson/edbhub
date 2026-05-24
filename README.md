# edbhub — Painel administrativo da Escola do Breno

Sistema interno de back-office para a equipe administrativa gerenciar o cadastro de alunos. CRUD com tratamento explícito de PII (CPF, e-mail, telefone), autenticação de admin via sessão server-side, e testes focados em validação e autorização.

Domínio em [CONTEXT.md](./CONTEXT.md). Decisões arquiteturais em [docs/adr/](./docs/adr/).

## Setup

Pré-requisitos: Docker.

```bash
docker compose up --build
```

Sobe o stack inteiro do zero — Postgres, Redis, API e Web. Em alguns minutos a aplicação está pronta em:

- Web: <http://localhost:5173>
- API: <http://localhost:3000>

Não precisa criar `.env` — os defaults estão embutidos no `docker-compose.yml`. Para sobrescrever, crie um `.env` na raiz copiando de [`.env.example`](./.env.example).

## Acesso como admin

A migration roda e o admin é semeado automaticamente no primeiro boot do container `api` via `prisma:seed`. Credenciais padrão (definidas em `.env.example` / defaults do compose):

| Campo | Valor |
| --- | --- |
| E-mail | `admin@escoladobreno.test` |
| Senha | `AdminTest123!` |

Para mudar antes do primeiro boot, exporte `ADMIN_EMAIL` / `ADMIN_PASSWORD` ou edite o `.env`. O seed é idempotente — re-rodar não duplica registros e re-aplica o hash da senha se mudar.

## O que foi entregue

### Must-have

- [x] Login admin (sessão server-side em Redis, cookie opaco `httpOnly` + `SameSite=strict`)
- [x] CRUD completo do aluno: listar, adicionar, editar, apagar
- [x] Validação server-side dos campos sensíveis (CPF com dígitos verificadores, e-mail, telefone em E.164)
- [x] Testes de validação e autorização (Vitest, 76 testes — unitários no `@edb/shared` e `@edb/api`, mais e2e em `@edb/api` via Fastify inject)
- [x] `docker compose up` funcionando do zero
- [x] README + CONTEXT.md + 5 ADRs (mínimo era 2)

### Nice-to-have feitos

- [x] Busca na listagem (nome, e-mail, CPF)
- [x] Soft delete com índices `UNIQUE` parciais (`WHERE "deletedAt" IS NULL`) — justificado em [ADR-0004](./docs/adr/0004-student-modeling.md)
- [x] Testes de API end-to-end (auth + students CRUD + rate limit)
- [x] Lint configurado (ESLint flat config, sem warnings)
- [x] ADRs adicionais (5 no total)

### Fora do escopo (intencional)

Os itens abaixo foram **conscientemente não implementados**, conforme orientação do brief:

- Audit log / histórico de edições
- Regras de negócio sobre alunos (transições de status, "não pode editar cancelado", etc.)
- Triggers, jobs, workflows agendados
- State machines
- UI bonita / branding / design polido

A justificativa de cada exclusão está em [CONTEXT.md](./CONTEXT.md#o-que-não-está-no-domínio).

## Ferramenta de IA principal

**Claude Code** (Anthropic). Usado para discutir decisões arquiteturais, escrever ADRs, planejar a implementação e gerar a maior parte do código sob revisão interativa. Decisões são minhas; o agente foi par de programação, não autônomo.

## Estrutura do repositório

```
apps/
  api/                NestJS + Fastify + Prisma + PostgreSQL
  web/                Vite + React 19 + Tailwind v4 + shadcn/ui
packages/
  shared/             Zod schemas + utilitários de domínio (CPF, telefone)
scripts/
  dev.mjs             Orquestrador de dev cross-platform (one-command setup)
docs/adr/             Architecture Decision Records (5)
docker-compose.yml    Stack de produção (db, redis, api, web)
compose.dev.yml       Overlay de dev — expõe db e redis no host
eslint.config.mjs     Flat config (ESLint 10 + typescript-eslint)
BRIEF.md              Brief original do teste
CONTEXT.md            Glossário do domínio e decisões de modelagem
CLAUDE.md             Convenções para ferramentas de IA neste repositório
```

## ADRs

| #    | Título                                                                                       |
| ---- | -------------------------------------------------------------------------------------------- |
| 0001 | [Stack](./docs/adr/0001-stack.md) — NestJS, Prisma, monorepo pnpm, Vitest                            |
| 0002 | [Autenticação](./docs/adr/0002-auth-strategy.md) — sessões opacas em Redis                           |
| 0003 | [Validação com Zod](./docs/adr/0003-validation-with-zod.md) — schemas compartilhados entre FE e BE   |
| 0004 | [Modelagem do aluno](./docs/adr/0004-student-modeling.md) — soft delete, normalização, UUID          |
| 0005 | [Tratamento de PII](./docs/adr/0005-pii-handling.md) — redação, formato de erro, credenciais         |

## Rodando os testes

```bash
pnpm install
pnpm test
```

`pnpm test` chama `pretest` antes (que sobe db + redis, aplica migrations e semeia o admin via `pnpm dev:infra`) e em seguida roda os testes nos workspaces. O hook é idempotente — se a infra já estiver de pé, vira no-op de poucos segundos.

Para reproduzir o CI inteiro localmente antes de empurrar:

```bash
pnpm ci:local
```

Roda install + prisma generate + shared build + lint + typecheck + build + test, na mesma ordem do `.github/workflows/ci.yml`, com as variáveis de aplicação (`DATABASE_URL`, `ADMIN_EMAIL`, etc.) explicitamente removidas do shell para flagrar bugs de carregamento de `.env` antes do push.

76 testes no total:

- **`@edb/shared`** (33 unitários): CPF (10), telefone (7), schemas Zod (16).
- **`@edb/api`** (26 unitários + 17 e2e): `ZodValidationPipe`, `AllExceptionsFilter`, `SessionService`, `AuthService` (inclui equalização de timing), `SessionGuard`, `StudentsService`, mais e2e cobrindo login/logout/`/auth/me`, CRUD completo de alunos (401 em todas as rotas sem sessão, 400 sem eco do valor inválido, 409 genérico em conflito) e rate limit no `/auth/login` (10/min).

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

`pnpm dev` é um wrapper Node ([`scripts/dev.mjs`](./scripts/dev.mjs)) que faz tudo em um comando: detecta `docker compose` (v2) ou `docker-compose` (v1), sobe `db` + `redis` via [`compose.dev.yml`](./compose.dev.yml) (que expõe as portas para o host — em produção elas ficam só na rede interna do compose, ver [ADR-0005](./docs/adr/0005-pii-handling.md)), aplica migrations, semeia o admin, e roda `apps/api` (porta 3000) e `apps/web` (porta 5173) em paralelo com prefixos coloridos `[api]` / `[web]`. Ctrl-C derruba os servidores; a infra fica de pé entre sessões.

Comandos auxiliares:

- `pnpm dev:infra` — prepara db + redis + migrations + seed, sem subir os servidores.
- `pnpm dev:infra:down` — derruba `db` + `redis` quando terminar.
