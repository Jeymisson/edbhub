# CONTEXT — Domínio: Painel Administrativo da Escola do Breno

Documento de domínio. Vocabulário do **problema**, não do código. Quem chegar aqui pela primeira vez (humano ou agente de IA) deve entender o que o sistema faz em 5 minutos, sem abrir um arquivo de código.

## Visão geral

Sistema interno de back-office da **Escola do Breno** para a equipe administrativa gerenciar o cadastro de alunos. Não há acesso público nem área do aluno — é uma ferramenta operacional usada pelo time da escola para manter o registro atualizado.

O sistema **não modela operação pedagógica** (matrículas, turmas, cobranças, presença). É um cadastro CRUD com PII tratada com cuidado.

## Atores

| Ator      | Descrição                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------- |
| **Admin** | Funcionário da escola autenticado no painel. Pode listar, criar, editar e remover alunos.                 |
| **Aluno** | Pessoa cadastrada no sistema. Entidade gerenciada — **não** é usuário do sistema, não faz login, não usa a aplicação. |

A única autenticação existente é a do Admin. Aluno é dado, não usuário.

## Entidade: Aluno

Registro de uma pessoa matriculada na escola. Campos:

| Campo          | Tipo / formato                       | PII? | Observações de domínio                                                                                                  |
| -------------- | ------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`           | UUID                                 | não  | Identificador interno. Estável, não reciclado.                                                                          |
| `nome`         | string                               | sim  | Nome completo, como aparece em documento oficial. Não normalizado (preserva acentos, capitalização do usuário).         |
| `email`        | string (RFC 5322)                    | sim  | Armazenado em lowercase. Único no sistema.                                                                              |
| `cpf`          | string de 11 dígitos                 | sim  | Armazenado normalizado (apenas dígitos). Validado pelo algoritmo oficial de dígitos verificadores. Único no sistema.    |
| `telefone`     | string normalizada (dígitos ou E.164) | sim  | Telefone de contato. Formato exato decidido em ADR.                                                                     |
| `plano`        | enum: `basic` \| `premium`            | não  | Plano contratado. Ver seção "Plano".                                                                                    |
| `status`       | enum: `ativo` \| `cancelado` \| `pausado` | não  | Situação do vínculo. Ver seção "Status".                                                                                |
| `createdAt`    | timestamp                            | não  | Data de cadastro no sistema.                                                                                            |
| `updatedAt`    | timestamp                            | não  | Última edição.                                                                                                          |
| `deletedAt`    | timestamp \| null                    | não  | Marca de soft delete, se adotado. Decisão em ADR.                                                                       |

### Por que esses campos

- **nome, email, telefone**: identificação e contato — mínimo operacional para uma escola conseguir falar com o aluno.
- **CPF**: documento legalmente exigido para emissão de recibos, contratos e nota fiscal de serviço educacional no Brasil. É também a chave natural de unicidade mais confiável para evitar cadastro duplicado.
- **plano e status**: campos descritivos do estado atual do aluno em relação à escola. **Não há regras de negócio sobre eles** — são metadados que o admin atualiza manualmente conforme a realidade muda. A escolha de não criar máquina de estados é deliberada (ver ADR).
- **createdAt / updatedAt**: rastreabilidade básica. Não é audit log.

### Por que NÃO incluímos outros campos

- **data de nascimento, endereço, responsável, RG**: o brief pede o mínimo, e cada campo adicional de PII aumenta a superfície de risco LGPD. Adicionar só se houver caso de uso real.
- **histórico, observações livres, anexos**: fora do escopo do CRUD descrito no brief.
- **senha do aluno**: aluno não loga no sistema.

## Plano

Indicação do tipo de pacote que o aluno contratou. O brief sugere `basic` e `premium` e **não define o que cada um inclui** — porque essa definição é da escola, não do sistema. O painel apenas registra o rótulo escolhido pelo admin.

- `basic` — plano padrão
- `premium` — plano com benefícios adicionais

Mudança de plano é uma edição direta no registro. Não há fluxo de upgrade/downgrade, não há histórico de mudanças.

## Status

Estado operacional do vínculo do aluno com a escola. Valores:

- `ativo` — aluno em situação regular, frequentando.
- `pausado` — aluno temporariamente afastado (licença, intercâmbio, etc.). Continua cadastrado.
- `cancelado` — vínculo encerrado. Permanece no sistema (com soft delete, se adotado) para histórico cadastral; não é uma exclusão.

A diferença entre `cancelado` e `apagado` (DELETE) é parte da decisão de soft delete — ver ADR.

## PII e LGPD

`nome`, `email`, `cpf` e `telefone` são dados pessoais sob a LGPD. O sistema trata-os com:

1. **Acesso restrito** — apenas admins autenticados leem ou modificam dados de aluno.
2. **Transporte seguro** — HTTPS obrigatório em produção; cookie de sessão com `httpOnly` + `Secure` + `SameSite=strict`.
3. **Não-loga PII** — logs estruturados omitem campos sensíveis; redator do logger lista `cpf`, `email`, `phone`, `password`, `Authorization`, `cookie`.
4. **CPF normalizado** — armazenado em formato canônico (apenas dígitos), validado pelo algoritmo oficial. Nunca exibido em mensagens de erro brutas para evitar vazamento por log de erro.
5. **Mensagens de erro genéricas** — falhas de validação não devolvem o valor submetido; falhas de autenticação não distinguem "usuário não existe" de "senha errada".

CPF não é criptografado em coluna por padrão — a base é interna, acesso só por admin autenticado, e o brief não exige cifra em repouso. Decisão registrada em ADR.

## O que NÃO está no domínio

Itens que parecem fazer parte do problema mas estão **explicitamente fora**, por orientação do brief:

- Transições de status com regras (ex: "não pode editar aluno cancelado") — **deliberadamente não modelado**.
- Histórico de edições / audit log.
- Workflows, triggers, jobs agendados.
- Cobrança, mensalidade, financeiro.
- Operação pedagógica: turmas, matrícula, presença, notas.
- Self-service do aluno.
- Comunicação ativa (envio de e-mail, SMS).

Cada exclusão acima é uma escolha consciente. Se a equipe quiser revisitar, deve ser via novo ADR, não por dedução tácita.
