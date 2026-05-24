# ADR-0001 — Stack

- **Status**: Aceito
- **Data**: 2026-05-23

## Contexto

Painel administrativo fullstack em TypeScript, com PostgreSQL, orquestrado por Docker Compose. O sistema lida com PII e precisa de autenticação, validação e autorização bem estruturadas. As escolhas que não são óbvias — e que merecem registro — são o **framework do backend**, a **ORM**, o **layout do repositório** e o **runner de testes**.

## Decisão

- **Layout**: workspaces do pnpm — `apps/web`, `apps/api`, `packages/shared`.
- **Backend**: NestJS com o adaptador Fastify.
- **ORM**: Prisma sobre PostgreSQL.
- **Frontend**: Vite + React 19 + TypeScript + Tailwind + shadcn/ui.
- **Testes**: Vitest, em todo o workspace.

## Alternativas consideradas

- **Fastify puro ou Hono** — runtime mais enxuto, startup mais rápido. Mas o NestJS já entrega os pontos de extensão de que esse sistema precisa: módulos para domínios delimitados, guards para autorização, pipes para validação. Construir essas abstrações na unha sobre um framework minimalista replica trabalho que o NestJS resolve bem.
- **Drizzle ORM** — SQL-first, mais leve, sem engine binário. A integração do Prisma com o NestJS é praticamente sem boilerplate, o ferramental de migrations é mais maduro e o client gerado oferece garantias mais fortes em tempo de compilação. O tamanho em runtime (~50 MB do engine) é aceitável num serviço containerizado.
- **Layout flat** (`frontend/` + `backend/`) — ferramenta mais simples. Mas obriga a duplicar tipos de domínio e regras de validação em duas bases TypeScript; o monorepo permite um pacote compartilhado sem overhead de publicação (ver ADR-0003).
- **Jest para a API** (padrão do scaffold do NestJS) — testado e estável, mas adiciona um segundo runner e estilo de configuração. Um runner único no workspace inteiro reduz a carga cognitiva.

## Consequências

- `packages/shared` vira a fonte única da verdade para tipos de domínio e validação entre os dois apps.
- As convenções do NestJS (módulos, DI, guards, pipes) passam a definir a linguagem estrutural da API.
- A imagem do container da API carrega uns 150–200 MB a mais (engine do Prisma + Node + runtime do framework). Aceitável para o escopo.
- Geração automática de OpenAPI a partir de metadata do class-validator deixa de estar disponível. `zod-to-openapi` cobre essa lacuna se documentação de schema da API virar requisito (ver ADR-0003).
