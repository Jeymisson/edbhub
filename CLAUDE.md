# edbhub — Escola do Breno, Painel Administrativo

Admin panel for student management. Greenfield CRUD with PII (CPF, email, telefone). Domain context lives in [CONTEXT.md](./CONTEXT.md). Architectural decisions live in [docs/adr/](./docs/adr/).

## Stack

- **Monorepo**: pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`
- **Frontend**: Vite + React 19 + TypeScript (strict) + Tailwind + shadcn/ui
- **Backend**: NestJS (Fastify adapter) + Prisma + PostgreSQL
- **Auth**: Server-side sessions in Redis, opaque session ID in `httpOnly` + `secure` + `SameSite=strict` cookie
- **Validation**: Zod schemas in `packages/shared`, consumed by both FE and BE
- **Orchestration**: Docker Compose (postgres, redis, api, web)

## Commands

```bash
docker compose up --build      # full prod-shaped stack from zero
pnpm install                   # install workspaces
pnpm dev                       # one-command local dev (infra + api + web)
pnpm dev:infra                 # only db + redis + migrate + seed (for tests)
pnpm dev:infra:down            # stop db + redis
pnpm test                      # all workspaces
pnpm lint                      # ESLint flat config
pnpm typecheck                 # tsc --noEmit across workspaces
pnpm build                     # production builds
```

## React conventions (React 19)

- Pure components: no side effects during render
- `useEffect` only to sync with **external** systems (APIs, subscriptions, timers, browser APIs, storage) — never for values derivable during render
- Always provide complete hook dependencies. Do not silence `exhaustive-deps` without an inline comment explaining why
- Keep state as local as possible; lift only when truly shared
- Controlled inputs for forms with validation, conditional UI, or submission logic
- Prevent duplicate submissions: disable submit + set pending state while in flight
- `React.memo` / `useMemo` / `useCallback` only with a clear rendering or identity reason — not by default
- `ref` is a regular prop (no `forwardRef`); use `<Context value={…}>` (no `.Provider`)
- Prefer `children` over boolean props like `isLoading`, `hasError`, `showIcon`

## TypeScript conventions

- `strict: true` is non-negotiable
- No `any`. Use `unknown` for untrusted data, then narrow or validate (Zod at boundaries)
- Type component props with a **named interface**
- Domain types over loose shapes: `{ id: string; label: string }`, not `Record<string, unknown>`
- Discriminated unions for mutually exclusive states:
  ```ts
  type Query<T> =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'success'; data: T }
  ```

## Backend conventions (NestJS)

- One module per bounded concept (`AuthModule`, `StudentsModule`, `PrismaModule`, `RedisModule`)
- Controllers thin; business logic in services
- DTOs validated by a `ZodValidationPipe` reading schemas from `@edb/shared`
- Guards for authorization (`SessionGuard`); decorators for current admin (`@CurrentAdmin()`)
- No `any` in service signatures; Prisma return types flow through

## PII handling (CPF, email, telefone)

- **Never log PII**. Logger redaction config drops `cpf`, `email`, `phone`, `password`, `Authorization`, `cookie`
- CPF stored normalized (digits only, 11 chars), validated against the official check-digit algorithm in `@edb/shared`
- Email stored lowercased, RFC-compliant validation
- Phone stored in E.164 or normalized digits; document the choice in an ADR
- Passwords (admin) hashed with argon2id
- Error responses never echo back submitted PII verbatim in messages

## Don'ts

- No premature abstractions. Three similar lines beats a wrong abstraction
- No feature flags or backwards-compat shims; this is a greenfield delivery
- No comments explaining WHAT — names do that. Only write a comment when the WHY is non-obvious
- No business rules on students (no "cannot edit cancelled student", no status transitions) — explicitly out of scope per BRIEF.md. If tempted, write an ADR explaining why we held back
- No audit log, no triggers, no jobs, no state machines — out of scope

## Folder structure

```
edbhub/
├── apps/
│   ├── api/                 # NestJS + Fastify
│   │   ├── src/{auth,students,prisma,redis,common}/
│   │   ├── prisma/{schema.prisma, seed.ts, migrations/}
│   │   └── test/            # e2e (auth, students, rate-limit)
│   └── web/                 # Vite + React 19
│       └── src/{features/{auth,students}, components/ui, lib}/
├── packages/
│   └── shared/              # Zod schemas + CPF / phone utils
├── scripts/
│   └── dev.mjs              # one-command dev orchestrator
├── docs/adr/                # 5 ADRs (see index below)
├── docker-compose.yml       # production stack
├── compose.dev.yml          # dev overlay (host ports for db + redis)
├── eslint.config.mjs        # ESLint 10 flat config
├── BRIEF.md
├── CONTEXT.md
├── CLAUDE.md
└── README.md
```

## ADRs

- [ADR-0001 — Stack](./docs/adr/0001-stack.md)
- [ADR-0002 — Autenticação](./docs/adr/0002-auth-strategy.md)
- [ADR-0003 — Validação com Zod](./docs/adr/0003-validation-with-zod.md)
- [ADR-0004 — Modelagem do aluno](./docs/adr/0004-student-modeling.md)
- [ADR-0005 — Tratamento de PII](./docs/adr/0005-pii-handling.md)

## Working style

- KISS. Lean code, minimal context bloat
- Match scope to the request; no surprise refactors
- Tests focus on **validation** (CPF/email/phone) and **authorization** (who can access what), per brief
- When a brief ambiguity surfaces, decide and write an ADR — that's the test
