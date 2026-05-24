# CONTEXT — Domínio do Painel Administrativo

Ferramenta interna administrativa para abrir, consultar, atualizar e encerrar registro de alunos. O aluno não é usuário do sistema, e a operação pedagógica da escola (turmas, presença, financeiro) vive fora deste software.

Setup e entrega no [README](./README.md); decisões arquiteturais em [docs/adr/](./docs/adr/).

## Atores

| Ator      | Descrição                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------- |
| **Admin** | Funcionário da escola autenticado no painel. Único usuário do sistema. Lista, cria, edita e remove alunos. |
| **Aluno** | Pessoa cadastrada. Entidade gerenciada — **não** é usuário, não faz login, não acessa a aplicação.        |

## Entidade: Aluno

Registro de uma pessoa matriculada na escola.

| Campo        | Tipo / formato                       | PII | Observação                                                                                       |
| ------------ | ------------------------------------ | --- | ------------------------------------------------------------------------------------------------ |
| `id`         | UUID                                 | não | Identificador interno, estável.                                                                  |
| `nome`       | string                               | sim | Nome completo, como em documento oficial. Não normalizado.                                       |
| `email`      | string (RFC 5322)                    | sim | Único entre alunos vivos. Armazenado em lowercase.                                               |
| `cpf`        | 11 dígitos                           | sim | Único entre alunos vivos. Armazenado normalizado, validado pelos dígitos verificadores.          |
| `telefone`   | E.164                                | sim | Default `BR` quando o input não traz código de país.                                             |
| `plano`      | enum: `basic` \| `premium`           | não | Ver "Plano".                                                                                     |
| `status`     | enum: `ativo` \| `pausado` \| `cancelado` | não | Ver "Status".                                                                            |
| `createdAt`  | timestamp                            | não | Data de cadastro.                                                                                |
| `updatedAt`  | timestamp                            | não | Última edição.                                                                                   |
| `deletedAt`  | timestamp \| null                    | não | Marca de soft delete.                                                                            |

### Por que esses campos

- **nome, email, telefone**: identificação e contato mínimos para a escola falar com o aluno.
- **CPF**: legalmente exigido para recibo, contrato e NF de serviço educacional. Também a chave natural de unicidade mais confiável contra duplicidade de cadastro.
- **plano, status**: rótulos descritivos do estado atual, atualizados manualmente pelo admin. Sem regras de transição, sem máquina de estados — escolha deliberada (ver [ADR-0004](./docs/adr/0004-student-modeling.md)).
- **createdAt, updatedAt, deletedAt**: ciclo de vida do registro. **Não é audit log** — não rastreamos autoria nem o que mudou.

### Por que NÃO outros campos

- **data de nascimento, endereço, responsável, RG**: cada campo adicional de PII aumenta superfície de risco LGPD. Adicionar só com caso de uso real.
- **histórico, observações livres, anexos**: fora do CRUD descrito no brief.
- **senha do aluno**: aluno não loga.

## Plano

Pacote que o aluno contratou. Valores: `basic`, `premium`. O brief sugere esses dois e **não define o que cada um inclui** — é decisão da escola, não do sistema. Mudança é edição direta no registro; não há fluxo de upgrade/downgrade nem histórico.

## Status

Estado operacional do vínculo do aluno com a escola:

- `ativo` — em situação regular, frequentando.
- `pausado` — temporariamente afastado (licença, intercâmbio etc.). Continua cadastrado.
- `cancelado` — vínculo encerrado. Permanece no sistema via soft delete — não é exclusão física.

Qualquer status transita para qualquer outro a critério do admin. A distinção entre `cancelado` (lógico, registro preservado) e `DELETE` (soft delete, `deletedAt` setado) está em [ADR-0004](./docs/adr/0004-student-modeling.md).

## PII

Quatro campos são PII sob a LGPD: `nome`, `email`, `cpf`, `telefone`. Disciplina operacional — redação em logs, formato de erro, hashing de credencial, exposição de rede — vive em [ADR-0005](./docs/adr/0005-pii-handling.md). Aqui registramos apenas o que pertence ao domínio:

- **CPF** é a chave natural de unicidade e é o único campo PII com algoritmo de validação próprio (dígitos verificadores).
- **E-mail** também é único por aluno vivo.
- Os quatro campos são restritos a admins autenticados — não há exposição pública desses dados.

## O que NÃO está no domínio

Itens que parecem fazer parte do problema mas estão deliberadamente fora:

- Transições de status com regras (ex.: "não pode editar aluno cancelado").
- Audit log / histórico de edições.
- Workflows, triggers, jobs agendados.
- Cobrança, mensalidade, financeiro.
- Operação pedagógica: turmas, matrícula, presença, notas.
- Self-service do aluno.
- Comunicação ativa (e-mail, SMS).

Cada exclusão é escolha consciente, alinhada ao brief. Revisitar exige novo ADR.
