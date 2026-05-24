# ADR-0005 — Tratamento de PII

- **Status**: Aceito
- **Data**: 2026-05-23

## Contexto

O sistema armazena PII (`nome`, `email`, `cpf`, `telefone`) e credenciais de admin, sob LGPD. Segurança de transporte e hardening de cookie ficam na ADR-0002; normalização de campos, na ADR-0004. Esta ADR cobre a higiene transversal — a que se aplica de forma uniforme em todo caminho que toca PII: **logging**, **formato de erro**, **armazenamento de credencial** e **exposição de infraestrutura**.

## Decisão

- **Redact dos logs.** O Pino é configurado com `redact` cobrindo request, response e payloads de erro para `cpf`, `email`, `phone`, `telefone`, `password`, `passwordHash`, `Authorization` e `cookie`. A configuração independe de ambiente — não existe modo verbose que a desligue.
- **Respostas de erro genéricas.**
  - Falhas de autenticação devolvem `401 { message: 'Invalid credentials' }`, sem distinguir usuário inexistente de senha errada.
  - Falhas de validação informam o campo e a razão (ex.: `cpf: 'invalid check digit'`), mas nunca devolvem o valor submetido.
  - Conflitos de unicidade em `cpf` ou `email` devolvem `409 { message: 'Conflict' }`, sem nomear o campo que colidiu.
- **Credenciais de admin.** Senhas hasheadas com argon2id em todo caminho de inserção. Texto puro nunca é armazenado, logado ou devolvido.
- **Exposição de rede.** PostgreSQL e Redis são alcançáveis apenas pela rede privada do Docker; nenhum dos dois mapeia porta para o host no `docker-compose.yml`. Existe um overlay `compose.dev.yml` que expõe as portas localmente — é opt-in (precisa ser passado explicitamente via `-f`), não é aplicado em produção, e é o que o orquestrador `pnpm dev` usa para desenvolvimento.
- **Sem criptografia em coluna** para PII. Justificativa abaixo.

## Alternativas consideradas

- **Criptografia em coluna para CPF.** Cifrar na camada da aplicação exige uma chave de busca determinística para preservar unicidade e lookups — na prática vira "armazenar duas colunas" e complica as queries. A proteção em repouso desse tipo geralmente vive na camada de volume ou de cluster, fora da fronteira da aplicação.
- **Hash unidirecional do CPF em vez de armazenamento.** O admin precisa ler o CPF de volta (contratos, suporte); um hash unidirecional inviabiliza o propósito do sistema.
- **Indicar qual campo colidiu em violação de unicidade**, para UX mais amigável. Vira oráculo de enumeração contra `email` e `cpf`.

## Consequências

- Debugar caminhos que tocam PII a partir dos logs fica deliberadamente limitado; o relato estruturado de erro carrega a carga diagnóstica sem expor valores sensíveis.
- Respostas de erro são enxutas; o frontend traduz códigos conhecidos em mensagens para o usuário.
- Introduzir criptografia em coluna mais à frente é uma migration não-trivial (colunas cifradas com busca exigem schemes determinísticos e gestão de chave). O modelo atual deixa essa porta aberta sem se comprometer.
- Todos os endpoints que tocam PII herdam redação e semântica de erro genérica de forma uniforme — não fica a pergunta "esse endpoint lembrou de aplicar a redação?".
