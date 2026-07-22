# Registro de Decisões de Segurança

> Documento vivo que registra **todas** as decisões de segurança aplicadas ao projeto Hunter Embarque.  
> Última atualização: 2026-02-27

---

## Índice

1. [Políticas de Acesso (RLS)](#1-políticas-de-acesso-rls)
2. [Validações em Edge Functions](#2-validações-em-edge-functions)
3. [Configurações de Autenticação](#3-configurações-de-autenticação)
4. [Restrições de CORS](#4-restrições-de-cors)
5. [Uso de Segredos (Secrets)](#5-uso-de-segredos-secrets)
6. [Mudanças Sensíveis no Banco](#6-mudanças-sensíveis-no-banco)
7. [Proteção contra XSS e Sanitização](#7-proteção-contra-xss-e-sanitização)

---

## 1. Políticas de Acesso (RLS)

### 1.1 — RLS habilitado em todas as tabelas públicas

| Campo | Detalhe |
|---|---|
| **Assunto** | Row Level Security (RLS) ativado globalmente |
| **Motivo** | Sem RLS, qualquer usuário autenticado pode ler/escrever em qualquer linha de qualquer tabela usando o client SDK. |
| **Justificativa** | O Supabase expõe a API REST diretamente ao navegador. RLS é a única camada que impede acesso horizontal (um usuário ver dados de outro). |
| **Revisão** | Verificado automaticamente pelo linter do Supabase; auditado manualmente a cada nova migração. |
| **Impacto se removido** | **Crítico** — Exposição total de dados: perfis, certificações, candidaturas, dados financeiros de medições, logs de auditoria. |
| **Status** | ✅ Ativo |

### 1.2 — Proibição de políticas `USING (true)` em tabelas sensíveis

| Campo | Detalhe |
|---|---|
| **Assunto** | Nenhuma tabela operacional usa `USING (true)` para SELECT |
| **Motivo** | `USING (true)` equivale a desativar RLS para aquela operação — qualquer autenticado lê tudo. |
| **Justificativa** | Dados como `profiles`, `certifications`, `clients`, `applications`, `audit_logs` contêm PII e informações comerciais. |
| **Revisão** | Scan de segurança automatizado + revisão manual. |
| **Impacto se removido** | **Crítico** — Vazamento de dados pessoais e comerciais para qualquer usuário logado. |
| **Status** | ✅ Ativo |

### 1.3 — Acesso de Company Users restrito via `client_candidates`

| Campo | Detalhe |
|---|---|
| **Assunto** | Empresas só veem candidatos explicitamente atribuídos a elas |
| **Motivo** | Clientes não devem ter acesso ao banco completo de profissionais — apenas aos que foram designados pela Hunter. |
| **Justificativa** | Princípio do menor privilégio + proteção da base de talentos como ativo comercial. Implementado via `EXISTS (SELECT 1 FROM client_candidates WHERE ...)` nas policies de `profiles`, `certifications` e `legal_requirements`. |
| **Revisão** | Testado com contas de empresa em ambiente de preview. |
| **Impacto se removido** | **Alto** — Empresas teriam acesso a todos os profissionais cadastrados, incluindo os atribuídos a concorrentes. |
| **Status** | ✅ Ativo |

### 1.4 — Admin e TI com acesso irrestrito a tabelas operacionais

| Campo | Detalhe |
|---|---|
| **Assunto** | Admins e TI podem ler/escrever em tabelas operacionais |
| **Motivo** | Necessário para gestão da plataforma, suporte e operações. |
| **Justificativa** | Verificação feita via funções SQL `is_admin(user_uuid)` e `is_ti(user_uuid)` com `SECURITY DEFINER`, consultando as tabelas `administrators` e `ti_users`. |
| **Revisão** | Funções RPC auditadas; sem cache de roles no client. |
| **Impacto se removido** | **Alto** — Admins perdem capacidade de operar a plataforma. |
| **Status** | ✅ Ativo |

### 1.7 — Permissões granulares por cargo na tabela `tasks`

| Campo | Detalhe |
|---|---|
| **Assunto** | RLS de tarefas diferencia cargos administrativos |
| **Motivo** | Nem todos os administradores devem ter acesso total às tarefas — apenas Diretores, Coordenadores de Operações e Supervisores podem designar/excluir tarefas de terceiros. |
| **Justificativa** | Políticas verificam o campo `cargo` na tabela `administrators` para determinar nível de acesso. Analistas e demais usuários só visualizam e editam tarefas que criaram ou foram atribuídas a eles via `assigned_to`. |
| **Revisão** | Testado com contas de diferentes cargos. Painel de referência em `/s/permissoes`. |
| **Impacto se removido** | **Médio** — Qualquer admin poderia ver/alterar/excluir tarefas de outros, quebrando a segregação de responsabilidades. |
| **Status** | ✅ Ativo |

### 1.5 — Tabela `api_rate_limits` bloqueada para client-side

| Campo | Detalhe |
|---|---|
| **Assunto** | Nenhuma policy de SELECT/INSERT/UPDATE/DELETE para roles comuns |
| **Motivo** | Rate limits são gerenciados exclusivamente via `SECURITY DEFINER` na função `check_rate_limit`. |
| **Justificativa** | Se exposta, um atacante poderia deletar seus próprios registros de rate limit para burlar a proteção. |
| **Impacto se removido** | **Alto** — Bypass de rate limiting, possibilitando spam e abuso de API. |
| **Status** | ✅ Ativo |

### 1.6 — View `agent_covers_public` com `security_invoker = true`

| Campo | Detalhe |
|---|---|
| **Assunto** | View pública de capas de agentes omite `webhook_url` |
| **Motivo** | O campo `webhook_url` contém endpoints internos do n8n que, se expostos, permitiriam invocação direta de automações. |
| **Justificativa** | A view projeta apenas `agent_id`, `cover_url`; a tabela base `agent_covers` é restrita a autenticados. |
| **Impacto se removido** | **Alto** — URLs de webhook expostas publicamente; atacantes poderiam disparar fluxos de automação. |
| **Status** | ✅ Ativo |

---

## 2. Validações em Edge Functions

### 2.1 — `verify_jwt = true` em todas as funções sensíveis

| Campo | Detalhe |
|---|---|
| **Assunto** | Gateway do Supabase exige JWT válido antes de executar a função |
| **Motivo** | Bloqueia requisições não autenticadas no nível da infraestrutura, antes de consumir compute. |
| **Justificativa** | Aplicado em: `create-admin`, `create-secure-admin`, `send-notification`, `manage-applications`, `generate-reports`, `create-client`, `delete-client`, `create-ti-user`, `create-candidate`, `admin-chat`, `elevenlabs-scribe-token`, `calculate-match-score`, `check-certificate-alerts`, `analyze-profile`, `delete-user`, `create-company-user`, `cleanup-orphaned-data`, `send-ti-verification-code`, `notify-candidate-status`, `setup-ti-admin`. |
| **Revisão** | Arquivo `supabase/config.toml` versionado no repositório. |
| **Impacto se removido** | **Crítico** — Funções administrativas acessíveis sem autenticação. |
| **Status** | ✅ Ativo |

### 2.2 — Exceções de JWT (`verify_jwt = false`)

| Campo | Detalhe |
|---|---|
| **Assunto** | `create-first-ti-user`, `n8n-chat`, `notify-webhook` não exigem JWT |
| **Motivo** | `create-first-ti-user`: bootstrap inicial quando não há nenhum admin; `n8n-chat`: webhook público para chatbot; `notify-webhook`: callback externo de sistemas terceiros. |
| **Justificativa** | Cada uma possui validação interna própria (código de verificação TI, validação de payload, etc.). |
| **Revisão** | Revisão manual periódica; monitorar logs de invocação. |
| **Impacto se removido** | Funcionalidades de bootstrap e integração externa deixariam de funcionar. |
| **Status** | ✅ Ativo — com monitoramento |

### 2.3 — Verificação de role dentro das Edge Functions

| Campo | Detalhe |
|---|---|
| **Assunto** | Funções verificam `is_admin` / `is_ti` após autenticar o JWT |
| **Motivo** | JWT válido apenas prova identidade, não autorização. Um candidato autenticado não pode executar ações de admin. |
| **Justificativa** | Aplicado em `send-notification`, `create-client`, `create-candidate`, `create-company-user`, `delete-client`, `delete-user`, `cleanup-orphaned-data`, `generate-reports`, `manage-applications`. |
| **Impacto se removido** | **Crítico** — Escalação de privilégio; qualquer usuário logado poderia criar clientes, deletar usuários, etc. |
| **Status** | ✅ Ativo |

### 2.4 — Autorização contextual em `calculate-match-score`

| Campo | Detalhe |
|---|---|
| **Assunto** | Só o dono do perfil, admins ou TI podem calcular match score |
| **Motivo** | Impedir que um candidato consulte scores de outros candidatos para obter vantagem competitiva. |
| **Justificativa** | Verifica `profileOwner.user_id === callerId` antes de permitir; fallback para check de admin/TI. |
| **Impacto se removido** | **Médio** — Vazamento de análise competitiva entre candidatos. |
| **Status** | ✅ Ativo |

### 2.5 — Validação de entrada com Zod em todas as funções

| Campo | Detalhe |
|---|---|
| **Assunto** | Schemas Zod validam tipo, formato e limites de todos os inputs |
| **Motivo** | Prevenir injeção de dados malformados, campos extras ou tipos inesperados. |
| **Justificativa** | Cada função define um schema estrito (ex: `z.string().email()`, `z.string().uuid()`, `z.enum([...])`). Erros de validação retornam 400 sem processar. |
| **Impacto se removido** | **Alto** — Possibilidade de injeção, crash de runtime, dados corrompidos no banco. |
| **Status** | ✅ Ativo |

### 2.6 — Rate limiting via `check_rate_limit` RPC

| Campo | Detalhe |
|---|---|
| **Assunto** | Cada função sensível verifica limite de requisições por usuário/minuto |
| **Motivo** | Prevenir abuso, brute force e DDoS no nível da aplicação. |
| **Justificativa** | Função SQL `SECURITY DEFINER` que atomicamente verifica e incrementa contadores na tabela `api_rate_limits`. Janela padrão: 10 requisições/minuto. |
| **Impacto se removido** | **Alto** — Sem limitação, atacante pode exaurir recursos, spammar notificações ou forçar operações em massa. |
| **Status** | ✅ Ativo |

### 2.7 — Proibição de retorno de senhas em respostas JSON

| Campo | Detalhe |
|---|---|
| **Assunto** | `create-client` e `create-candidate` não retornam `defaultPassword` |
| **Motivo** | Senhas temporárias em respostas HTTP podem ser interceptadas, logadas ou exibidas acidentalmente na UI. |
| **Justificativa** | Resposta contém apenas `success`, `userId`, `clientId`. Frontend exibe mensagem genérica "instruções de acesso serão enviadas". |
| **Impacto se removido** | **Crítico** — Credenciais expostas em logs do navegador, rede e toasts. |
| **Status** | ✅ Ativo |

### 2.8 — Senhas aleatórias para novos usuários (sem senha padrão)

| Campo | Detalhe |
|---|---|
| **Assunto** | `create-client` e `create-candidate` geram senha aleatória de 16 caracteres por conta |
| **Motivo** | Senha padrão hardcoded (`Hunters@2024`) era previsível e visível no código-fonte. Atacante que identificasse contas recém-criadas poderia acessar antes da troca obrigatória. |
| **Justificativa** | Substituída por `crypto.getRandomValues()` gerando 16 chars de `A-Za-z0-9!@#$%&*`. Cada conta recebe senha única e imprevisível. Troca obrigatória mantida (`must_change_password: true`). |
| **Revisão** | Scan de segurança 2026-02-25 — finding `default_client_pwd` resolvido. |
| **Impacto se removido** | **Crítico** — Retorno a senha previsível; contas vulneráveis entre criação e primeira troca. |
| **Status** | ✅ Ativo |

### 2.9 — Validação de role no `elevenlabs-scribe-token`

| Campo | Detalhe |
|---|---|
| **Assunto** | Apenas candidatos, admins e TI podem solicitar tokens de transcrição ElevenLabs |
| **Motivo** | Sem validação de role, qualquer usuário autenticado (inclusive clientes) poderia exaurir créditos de API pagos. |
| **Justificativa** | Verificação via `get_user_role` RPC. Clientes recebem HTTP 403. Candidatos têm acesso legítimo (assistente de voz para preenchimento de perfil). Rate limiting (10 req/min) mantido como camada adicional. |
| **Revisão** | Scan de segurança 2026-02-25 — finding `elevenlabs_token_exposure` resolvido. |
| **Impacto se removido** | **Médio** — Abuso de créditos de API pagos por usuários não autorizados. |
| **Status** | ✅ Ativo |

### 2.10 — Políticas RLS de Storage (buckets)

| Campo | Detalhe |
|---|---|
| **Assunto** | Políticas RLS completas para `feed-media`, `feed-documents`, `job-covers`, `agent-covers` |
| **Motivo** | Buckets sem RLS permitiam upload/delete sem restrição por qualquer usuário autenticado. |
| **Justificativa** | `feed-media`: upload/delete restrito a avatars, leitura pública. `feed-documents`: operações restritas ao owner (`user_id` como pasta), leitura por clients via policy existente. `job-covers` e `agent-covers`: gestão exclusiva de admin/TI, leitura pública. Admins/TI têm acesso irrestrito a todos os buckets. |
| **Revisão** | Scan de segurança 2026-02-25 — finding `no_storage_rls` resolvido. |
| **Impacto se removido** | **Alto** — Upload de arquivos maliciosos, enumeração de documentos, exclusão não autorizada. |
| **Status** | ✅ Ativo |

---

## 3. Configurações de Autenticação

### 3.1 — Logout global (`scope: 'global'`)

| Campo | Detalhe |
|---|---|
| **Assunto** | `signOut` revoga o refresh token no servidor |
| **Motivo** | Logout local apenas limpa o client; o refresh token continua válido em outros dispositivos. |
| **Justificativa** | `supabase.auth.signOut({ scope: 'global' })` invalida todas as sessões ativas do usuário. |
| **Impacto se removido** | **Alto** — Sessões em dispositivos roubados ou compartilhados continuam ativas após "logout". |
| **Status** | ✅ Ativo |

### 3.2 — Timeout de inatividade (30 minutos)

| Campo | Detalhe |
|---|---|
| **Assunto** | Hook `useSessionSecurity` força logout após 30 min sem atividade |
| **Motivo** | Terminais compartilhados ou esquecidos abertos representam risco de acesso não autorizado. |
| **Justificativa** | Monitora `mousedown`, `keydown`, `touchstart`, `scroll`. Ao expirar, limpa `sessionStorage` e redireciona para `/login`. |
| **Impacto se removido** | **Alto** — Sessões abandonadas ficam ativas indefinidamente. |
| **Status** | ✅ Ativo |

### 3.3 — Sincronização cross-tab de logout

| Campo | Detalhe |
|---|---|
| **Assunto** | Listener `storage` detecta logout em outra aba |
| **Motivo** | Se o usuário faz logout em uma aba, outras abas abertas devem encerrar imediatamente. |
| **Justificativa** | Monitora remoção de chaves Supabase auth no `localStorage`. |
| **Impacto se removido** | **Médio** — Abas antigas continuam autenticadas após logout em outra aba. |
| **Status** | ✅ Ativo |

### 3.4 — Verificação de role via RPC no AuthContext (sem cache local)

| Campo | Detalhe |
|---|---|
| **Assunto** | `get_user_role` é chamado a cada carregamento, nunca cacheado no `localStorage` |
| **Motivo** | Roles cacheadas no client podem ser manipuladas via DevTools para escalação de privilégio. |
| **Justificativa** | O AuthContext consulta `get_user_role` RPC em cada `onAuthStateChange`, garantindo que a role reflete o estado atual do banco. |
| **Impacto se removido** | **Crítico** — Spoofing de role; candidato poderia se passar por admin no frontend. |
| **Status** | ✅ Ativo |

### 3.5 — Limpeza de dados sensíveis no logout

| Campo | Detalhe |
|---|---|
| **Assunto** | `cleanupSessionData()` remove dados do `sessionStorage` e chaves específicas do `localStorage` |
| **Motivo** | Dados residuais podem conter tokens, redirects ou estado sensível. |
| **Justificativa** | Executado em logout manual, timeout de inatividade e sincronização cross-tab. |
| **Impacto se removido** | **Médio** — Dados residuais acessíveis ao próximo usuário do mesmo navegador. |
| **Status** | ✅ Ativo |

---

## 4. Restrições de CORS

### 4.1 — Whitelist dinâmica de origens

| Campo | Detalhe |
|---|---|
| **Assunto** | Edge Functions aceitam apenas origens autorizadas |
| **Motivo** | Impedir que sites maliciosos façam requisições autenticadas usando cookies/tokens do navegador da vítima. |
| **Justificativa** | Lista fixa: `https://hunterembarque.com`, `https://preview--hunterembarque.lovable.app`, `https://hunterembarque.lovable.app` + qualquer `*.lovable.app` para previews. Origens não autorizadas recebem `Access-Control-Allow-Origin: null`. |
| **Impacto se removido** | **Alto** — Qualquer site pode fazer requisições à API em nome de usuários logados (CSRF via CORS). |
| **Status** | ✅ Ativo |

---

## 5. Uso de Segredos (Secrets)

### 5.1 — Chaves de API armazenadas como Supabase Secrets

| Campo | Detalhe |
|---|---|
| **Assunto** | `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são secrets do servidor |
| **Motivo** | Chaves de API em código-fonte ou variáveis de ambiente do frontend são extraíveis por qualquer visitante. |
| **Justificativa** | Acessíveis apenas via `Deno.env.get()` dentro de Edge Functions. Nunca expostas ao navegador. |
| **Impacto se removido** | **Crítico** — Chaves expostas permitem uso fraudulento de serviços pagos e acesso total ao banco (service role key). |
| **Status** | ✅ Ativo |

### 5.2 — `SUPABASE_ANON_KEY` no frontend (permitido)

| Campo | Detalhe |
|---|---|
| **Assunto** | Apenas a anon key é usada no client-side |
| **Motivo** | A anon key é projetada para ser pública; suas permissões são limitadas pelas políticas RLS. |
| **Justificativa** | Documentação oficial do Supabase confirma que é seguro expor a anon key, pois ela opera sob RLS. |
| **Impacto se removido** | O frontend não conseguiria se comunicar com o Supabase. |
| **Status** | ✅ Ativo |

---

## 6. Mudanças Sensíveis no Banco

### 6.1 — Auditoria automática via tabela `audit_logs`

| Campo | Detalhe |
|---|---|
| **Assunto** | Operações administrativas são registradas automaticamente |
| **Motivo** | Rastreabilidade de quem fez o quê e quando, essencial para compliance e investigação de incidentes. |
| **Justificativa** | Triggers e inserts manuais nas Edge Functions gravam ação, user_id, email, role, dados antigos/novos. |
| **Impacto se removido** | **Alto** — Perda total de rastreabilidade; impossível investigar incidentes. |
| **Status** | ✅ Ativo |

### 6.2 — Funções SQL com `SECURITY DEFINER`

| Campo | Detalhe |
|---|---|
| **Assunto** | `is_admin`, `is_ti`, `get_user_role`, `check_rate_limit` executam com privilégios do owner |
| **Motivo** | Essas funções precisam consultar tabelas (`administrators`, `ti_users`, `api_rate_limits`) que não são acessíveis diretamente pelo usuário. |
| **Justificativa** | O `SECURITY DEFINER` permite que a função acesse tabelas restritas sem abrir policies para o client. Configurado com `search_path = public` para evitar hijacking. |
| **Impacto se removido** | **Crítico** — Verificações de role e rate limiting deixariam de funcionar; ou tabelas precisariam ser expostas. |
| **Status** | ✅ Ativo |

### 6.3 — Constraint de validação de role na tabela `profiles`

| Campo | Detalhe |
|---|---|
| **Assunto** | Check constraint limita valores do campo `role` |
| **Motivo** | Impedir inserção de roles inexistentes ou maliciosas via SQL injection ou manipulação direta. |
| **Justificativa** | Valores permitidos definidos no constraint; rejeição automática no nível do banco. |
| **Impacto se removido** | **Médio** — Possibilidade de inserir roles arbitrárias e contornar verificações. |
| **Status** | ✅ Ativo |

---

## 7. Proteção contra XSS e Sanitização

### 7.1 — SecurityProvider com Content Security Policy (CSP)

| Campo | Detalhe |
|---|---|
| **Assunto** | Meta tag CSP injeta política de segurança de conteúdo |
| **Motivo** | Bloquear execução de scripts inline maliciosos e carregamento de recursos de origens não autorizadas. |
| **Justificativa** | Componente `SecurityProvider` envolve toda a aplicação e detecta tentativas de script injection. |
| **Impacto se removido** | **Alto** — Ataques XSS refletidos e stored teriam execução livre. |
| **Status** | ✅ Ativo |

### 7.2 — Sanitização de input via `src/lib/sanitize.ts`

| Campo | Detalhe |
|---|---|
| **Assunto** | Todos os inputs de texto passam por sanitização antes de envio |
| **Motivo** | Prevenir injeção de HTML/JS em campos de formulário que são renderizados posteriormente. |
| **Justificativa** | Função utilitária strip tags, entidades e padrões perigosos. Validação de tamanho (max 2000 chars). |
| **Impacto se removido** | **Alto** — XSS stored via campos de perfil, notas, descrições de vagas. |
| **Status** | ✅ Ativo |

---

## Configurações Pendentes (Dashboard Supabase)

| Configuração | Recomendação | Status |
|---|---|---|
| Expiração de OTP | Reduzir para 60 segundos | ⏳ Pendente (manual) |
| Leaked Password Protection | Ativar no Dashboard | ⏳ Pendente (manual) |
| JWT Expiry | Reduzir para 15–30 minutos | ⏳ Pendente (manual) |
| Patches de segurança Postgres | Aplicar versão mais recente | ⏳ Pendente (manual) |

---

**Responsável pela manutenção:** Equipe de desenvolvimento  
**Periodicidade de revisão:** A cada nova migração ou alteração em Edge Functions
