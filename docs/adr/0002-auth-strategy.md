# ADR-0002 — Autenticação

- **Status**: Aceito
- **Data**: 2026-05-23

## Contexto

Um único papel no sistema (Admin), autenticando a partir de um navegador, e todos os endpoints protegidos devolvem PII. O modelo de autenticação precisa: (a) resistir a XSS sem expor credenciais, (b) suportar revogação instantânea, (c) não trazer complexidade operacional desnecessária.

## Decisão

Identificadores de sessão opacos, emitidos pelo servidor, guardados no Redis com TTL e transportados por um cookie `httpOnly` + `Secure` + `SameSite=strict`.

- **Login**: credenciais verificadas com argon2id contra `Admin.passwordHash`; um ID de sessão aleatório de 32 bytes vai pro Redis em `session:<id>` com o TTL configurado e volta no cookie.
- **Requisições autenticadas**: um `SessionGuard` lê o cookie, consulta o Redis e anexa o admin atual à requisição.
- **Logout**: `DEL session:<id>` e cookie limpo.

### Hardening do `/auth/login`

Três proteções específicas para o endpoint que é alvo natural de brute force:

- **Rate limit**: 10 tentativas por minuto por IP via `@nestjs/throttler`. Acima disso, devolvemos `429`. O resto da API herda um teto folgado de 100 req/min do throttler global.
- **Equalização de timing**: o `AuthService.login` roda o `argon2.verify` mesmo quando o e-mail submetido não existe (usando um hash dummy precomputado), pra que o tempo de resposta não permita enumerar e-mails de admin por análise de timing.
- **Cap no tamanho da senha**: o `loginSchema` em `@edb/shared` rejeita `password` com mais de 256 caracteres. Sem esse limite, um atacante mandaria payloads gigantes pra forçar `argon2` a queimar CPU e memória antes mesmo da verificação falhar.

## Alternativas consideradas

- **JWT no header `Authorization`, guardado em `localStorage`**. O armazenamento é legível por JS — qualquer XSS vira roubo de credencial. Inviável para uma ferramenta que lida com PII.
- **JWT em cookie `httpOnly`**. Stateless, dispensa um armazenamento de sessões. Mas perde a revogação instantânea. Reintroduzir essa capacidade via lista de bloqueio acaba reconstruindo um armazenamento de sessões no servidor — só que agora também sobrando lidar com assinatura de token, rotação de chave e confusão de algoritmo.

## Consequências

- Mais um serviço no `docker-compose.yml` (Redis, ~5 MB de imagem, sobe em menos de um segundo). Possível ponto único de falha.
- Os tokens de sessão não carregam claims — um cookie vazado não revela role nem dado do usuário e revoga em uma única operação.
- Cada requisição autenticada paga uma consulta sub-milissegundo no Redis.
- Escala horizontalmente para múltiplas réplicas da API sem ajuste algum.
- O `@nestjs/throttler` mantém o contador em memória local. Em múltiplas réplicas isso vira "10 req/min por réplica" em vez de global — aceitável no escopo atual, mas trocar pelo storage Redis do throttler é simples se virar requisito.
- A equalização de timing custa um `argon2.verify` no caminho de e-mail desconhecido (~13ms aqui) que antes era sub-milissegundo. Trade aceitável pelo benefício de fechar o oráculo de enumeração.
