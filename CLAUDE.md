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
docker compose up              # full stack from zero
pnpm install                   # install workspaces
pnpm --filter @edb/api dev     # api dev server
pnpm --filter @edb/web dev     # web dev server
pnpm --filter @edb/api test    # api tests (Vitest)
pnpm --filter @edb/api prisma migrate dev
pnpm lint
pnpm typecheck
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
edb-ms/
├── apps/
│   ├── api/                 # NestJS + Fastify
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── students/
│   │   │   ├── prisma/
│   │   │   ├── redis/
│   │   │   └── main.ts
│   │   ├── prisma/schema.prisma
│   │   └── test/
│   └── web/                 # Vite + React 19
│       ├── src/
│       │   ├── features/    # students/, auth/
│       │   ├── components/  # shadcn-based, reusable
│       │   └── lib/
│       └── index.html
├── packages/
│   └── shared/              # Zod schemas, domain types, CPF utils
├── docs/
│   └── adr/                 # Architecture Decision Records
├── docker-compose.yml
├── pnpm-workspace.yaml
├── BRIEF.md
├── CONTEXT.md
└── README.md
```

## ADR index (`docs/adr/`)

To be written as decisions are cemented. Planned:

- ADR-001 — Stack: NestJS + Fastify, Prisma, Vite + React 19, pnpm monorepo
- ADR-002 — Auth: server-side Redis sessions over JWT
- ADR-003 — Validation: Zod schemas in `packages/shared`, shared FE/BE
- ADR-004 — Student modeling: fields, soft delete decision, normalization
- ADR-005 — PII handling: CPF normalization, log redaction, transport security

## Working style

- KISS. Lean code, minimal context bloat
- Match scope to the request; no surprise refactors
- Tests focus on **validation** (CPF/email/phone) and **authorization** (who can access what), per brief
- When a brief ambiguity surfaces, decide and write an ADR — that's the test
