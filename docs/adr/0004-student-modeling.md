# ADR-0004 — Modelagem do aluno

- **Status**: Aceito
- **Data**: 2026-05-23

## Contexto

O `CONTEXT.md` descreve o domínio e lista os campos da entidade `Aluno`. As escolhas de modelagem que não saem direto do domínio são: a **semântica do delete**, o **formato de armazenamento do telefone**, o **formato de armazenamento do CPF**, a **estratégia de chave primária** e a **representação em banco** de `plano` / `status`.

## Decisão

- **Soft delete.** `DELETE /students/:id` seta `deletedAt = now()`. Todas as leituras filtram `deletedAt IS NULL`. Os índices únicos em `cpf` e `email` são parciais (`WHERE deletedAt IS NULL`), então um registro soft-deletado não impede um novo cadastro com os mesmos identificadores.
- **Telefone em E.164** (`+5511987654321`). A entrada é permissiva (`(11) 98765-4321`, `11987654321`, `+55…`); o parse usa `libphonenumber-js` com país padrão `BR` quando não tem prefixo internacional. O armazenamento é sempre canônico.
- **CPF como 11 dígitos, sem máscara.** Entrada permissiva; a validação tira tudo que não é dígito, rejeita sequências de 11 dígitos iguais e roda o algoritmo de duas passadas dos dígitos verificadores.
- **Chave primária UUID**, gerada pelo servidor. Bloqueia enumeração de registros de PII por IDs previsíveis.
- **Enums nativos do PostgreSQL** para `plano` (`basic`, `premium`) e `status` (`ativo`, `pausado`, `cancelado`). Restrição no nível do schema, sem manter `CHECK` em string.

## Alternativas consideradas

- **Hard delete**. Mais simples, dispensa índices parciais e o filtro `deletedAt IS NULL`. Mas conflita com a leitura de domínio de `cancelado` ("vínculo encerrado, registro preservado") e descarta histórico cadastral que o domínio trata como relevante.
- **Telefone só com dígitos brasileiros** (`11987654321`). Regex mais simples, sem biblioteca. Mas trava o modelo num único país; E.164 é a representação portável e custa só uma dep de ~30 KB.
- **Chave primária inteira sequencial.** Armazenamento menor, URLs mais amigáveis. Mas permite enumerar registros de PII iterando IDs; UUIDs neutralizam esse vetor por um custo desprezível.
- **CPF armazenado com máscara** (`123.456.789-09`). Fragiliza checagens de unicidade e dobra a superfície de validação.

## Consequências

- Todo caminho de leitura precisa filtrar `deletedAt IS NULL`. Centralizado no service de Students para não repetir o predicado em cada handler.
- Os índices únicos parciais exigem uma migration raw específica do PostgreSQL no Prisma. Setup feito uma vez, documentado inline no arquivo da migration.
- `libphonenumber-js` (~30 KB) é dep de runtime em `packages/shared`.
- `createdAt`, `updatedAt` e `deletedAt` são colunas de ciclo de vida apenas. Autoria e histórico de mudanças não ficam registrados; um audit log está fora do escopo.
