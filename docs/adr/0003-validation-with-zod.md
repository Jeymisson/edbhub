# ADR-0003 — Validação com Zod

- **Status**: Aceito
- **Data**: 2026-05-23

## Contexto

Campos sensíveis (CPF, e-mail, telefone) precisam de validação server-side, e o frontend também se beneficia da validação para feedback de UX. Manter essas regras em duas bases independentes leva a drift com o tempo, principalmente em lógica não-trivial como a verificação de dígitos verificadores do CPF.

A stack padrão de validação do NestJS (class-validator + class-transformer) amarra a validação a instâncias de classe com decorators, que não se transferem bem para um frontend buildado com Vite — exige duplicar as regras ou rodar metadata de decorator no navegador em runtime.

## Decisão

Definir todos os schemas de validação em `packages/shared` com Zod, consumido pelos dois apps.

- A API expõe um `ZodValidationPipe` enxuto (~20 linhas) que lança `BadRequestException` quando o parse falha.
- O frontend consome os mesmos schemas via `react-hook-form` com `@hookform/resolvers/standard-schema` (Zod 4 implementa a Standard Schema spec).
- Os tipos estáticos saem dos schemas via `z.infer<typeof X>` — sem interfaces de entidade ou DTO mantidas à mão.
- Primitivos de domínio (algoritmo de dígitos verificadores do CPF, normalização de telefone para E.164) vivem ao lado dos schemas.

## Alternativas consideradas

- **class-validator + class-transformer**. Idiomático no NestJS, mas preso a instâncias de classe — compartilhar com o frontend obriga ou duplicar regras ou avaliar metadata de decorator no navegador.
- **Bibliotecas diferentes em cada lado** (Zod na API, Yup no frontend, por exemplo). Joga fora o objetivo do schema compartilhado.

## Consequências

- Uma única fonte da verdade para validação. Testes contra `packages/shared` exercitam as regras dos dois lados por construção.
- Perdemos a geração automática de OpenAPI a partir de metadata do class-validator. `zod-to-openapi` cobre o caso se documentação de schema da API virar requisito.
- `packages/shared` precisa ser buildado antes de `apps/api` fazer typecheck; a topologia do workspace do pnpm cuida da ordem automaticamente.
