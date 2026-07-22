# Changelog

Todas as alterações relevantes do projeto Hunter Embarque são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [2026-02-27] — Permissões por Cargo e Painel T.I de Referência

### [FEATURE] Adicionado
- **Matriz de Permissões T.I:** Nova página `/s/permissoes` no painel T.I com tabela de referência completa mostrando permissões (Ver/Criar/Editar/Excluir) por cargo (Diretor, Coordenador de Operações, Supervisor, Analista) em todos os módulos do sistema. Arquivo: `src/pages/TIPermissions.tsx`.
- **Sidebar T.I atualizada:** Item "Permissões" adicionado ao grupo "Configurações" no menu lateral do T.I. Arquivo: `src/components/ti/TISidebar.tsx`.

### [SECURITY] Alterado
- **RLS de Tarefas refinado:** Políticas de RLS da tabela `tasks` atualizadas para refletir novo modelo de permissões:
  - Todos os usuários autenticados podem criar tarefas (auto-atribuídas).
  - Diretores, Coordenadores de Operações e Supervisores podem designar tarefas a qualquer usuário e excluir tarefas.
  - Demais usuários visualizam/editam apenas tarefas que criaram ou foram atribuídas a eles.
- **Frontend de Tarefas:** Botão "Nova Tarefa" disponível para todos; seletor de responsáveis restrito a cargos privilegiados; botão de exclusão restrito a cargos privilegiados. Arquivo: `src/pages/AdminTasks.tsx`.

---

## [2026-02-27] — Refatoração do Sistema de Tarefas

### [REFACTOR] Alterado
- **Tarefas simplificadas:** Removida a estrutura de Espaços e Listas. Todas as tarefas agora ficam em uma única visualização, agrupadas por etiquetas (tags). Arquivo: `src/pages/AdminTasks.tsx`.
- **Múltiplos responsáveis:** Campo `assigned_to` alterado de `uuid` (único) para `uuid[]` (array) na tabela `tasks`, permitindo designar múltiplas pessoas por tarefa.
- **Visibilidade por responsável:** Adicionadas políticas RLS para que usuários designados possam visualizar e atualizar apenas suas próprias tarefas.
- **Status fixo:** Status agora são armazenados diretamente na tarefa (`status_name`, `status_color`) sem depender da tabela `task_statuses`.
- **Filtro por etiqueta:** Adicionado filtro por etiqueta no cabeçalho da página de tarefas.

---

## [2026-02-27] — Correção de Timezone em Tarefas e Atualização de Webhook

### [FIX] Corrigido
- **Datas de tarefas:** Corrigido bug onde datas de início e entrega de tarefas apareciam um dia antes do selecionado. Causa: `new Date("YYYY-MM-DD")` interpretava como UTC em vez de horário local. Substituído por `parseDateLocal()` em toda a lógica de criação, edição e exibição de datas. Arquivo: `src/pages/AdminTasks.tsx`.

### [INTEGRAÇÃO] Alterado
- **Webhook de tarefas:** URL do webhook `notify-webhook` atualizada para `https://n8n-n8n.ooqqkc.easypanel.host/webhook/20da9264-69f2-48bf-ab22-18e676fc8aa6`. Migração: `system_webhooks`.

### [BUILD] Corrigido
- **embla-carousel:** Corrigido erro de build causado por incompatibilidade de tipos entre `embla-carousel-autoplay` e `embla-carousel-react`. Arquivo: `src/components/HuntersIOTab.tsx`.

---

## [2026-02-25] — Correção de Bucket Público de Vídeos

### [SECURITY] Corrigido
- **Crítico:** Bucket `candidate-videos` alterado de público para privado. Política `Candidate videos are publicly readable` removida e substituída por RLS granular: candidatos acessam próprios vídeos, clientes acessam vídeos de candidatos atribuídos, admins/TI têm acesso total. Frontend atualizado para usar signed URLs com expiração de 1h. Arquivos: `src/components/CandidateVideoSection.tsx`, `src/components/CandidateVideoUpload.tsx`.

---

## [2026-02-25] — Substituição de Dependência Vulnerável

### [SECURITY] Corrigido
- **Alto:** Substituída dependência `xlsx` (SheetJS) por `exceljs` — vulnerabilidades de Prototype Pollution (GHSA-4r6h-8v6p-xvw6) e ReDoS (GHSA-5pgg-2g8v-p4x9) eliminadas. Arquivo: `src/components/GenericTableReportExport.tsx`.

---

## [2026-02-25] — Correção de Vulnerabilidades (Scan de Segurança)

### [SECURITY] Corrigido
- **Crítico:** Removida senha padrão hardcoded `Hunters@2024` das Edge Functions `create-client` e `create-candidate`. Agora cada conta recebe uma senha aleatória de 16 caracteres gerada via `crypto.getRandomValues()`. Arquivos: `supabase/functions/create-client/index.ts`, `supabase/functions/create-candidate/index.ts`.
- **Alto:** Adicionada validação de role na Edge Function `elevenlabs-scribe-token` — apenas candidatos, admins e TI podem solicitar tokens de transcrição. Clientes são bloqueados (HTTP 403). Arquivo: `supabase/functions/elevenlabs-scribe-token/index.ts`.

### [DATABASE] Adicionado
- Políticas RLS completas para buckets de storage: `feed-media`, `feed-documents`, `job-covers`, `agent-covers`. Inclui INSERT/UPDATE/DELETE restritos por ownership e role, com acesso admin/TI irrestrito. SELECT público para buckets públicos.

### [SECURITY] Alterado
- Finding `definer_funcs_rls` atualizado para risco aceito — todas as funções SECURITY DEFINER foram auditadas, possuem `search_path` fixo e checks de autorização. Revisão trimestral agendada.

---

## [2026-02-25] — Hardening de Segurança Completo

### [SECURITY] Adicionado
- Documento `SECURITY.md` com registro formal de todas as decisões de segurança (RLS, Edge Functions, autenticação, CORS, secrets, XSS).
- Documento `VULNERABILITY-MONITORING.md` com processo de monitoramento, triagem, checklists e histórico de incidentes.
- Documento `CHANGELOG.md` para rastreamento contínuo de alterações.
- Hook `useSessionSecurity` — timeout de inatividade (30 min), logout cross-tab, limpeza de dados sensíveis.
- Verificação de role (`is_admin`/`is_ti`) na Edge Function `send-notification`.
- Autorização contextual na Edge Function `calculate-match-score` — apenas dono do perfil, admins ou TI.
- Logout global com `scope: 'global'` no `AuthContext.signOut()`.

### [SECURITY] Corrigido
- **Crítico:** Removido retorno de `defaultPassword` nas respostas JSON de `create-client` e `create-candidate`.
- **Crítico:** Removida exibição de senha padrão em toasts (`AdminCandidateDrawer`, `AdminCandidateForm`, `AdminClients`).
- **Crítico:** Criada view `agent_covers_public` omitindo `webhook_url`; RLS da tabela base restrito a autenticados.
- **Alto:** Corrigido `verify_jwt = false` em 19 Edge Functions no `config.toml` — todas agora exigem JWT.

### [SECURITY] Alterado
- `AppSidebar` e `TISidebar` — logout usa `window.location.href` (hard redirect) em vez de navegação SPA para garantir limpeza total de estado.
- `AuthContext` — verificação de role via RPC `get_user_role` a cada carregamento, sem cache no `localStorage`.

---

## Convenções de Registro

### Categorias de Tag

| Tag | Uso |
|---|---|
| `[SECURITY]` | Alterações de segurança: RLS, autenticação, autorização, secrets, XSS |
| `[FEATURE]` | Novas funcionalidades para o usuário |
| `[FIX]` | Correções de bugs não relacionados a segurança |
| `[REFACTOR]` | Reestruturação de código sem mudança de comportamento |
| `[UI]` | Alterações visuais, layout, design system |
| `[DATABASE]` | Migrações, novas tabelas, alterações de schema |
| `[EDGE-FUNCTION]` | Criação ou alteração de Edge Functions |
| `[DOCS]` | Documentação |

### Subcategorias

| Subcategoria | Descrição |
|---|---|
| **Adicionado** | Novas funcionalidades ou recursos |
| **Corrigido** | Correções de bugs ou vulnerabilidades |
| **Alterado** | Mudanças em funcionalidades existentes |
| **Removido** | Funcionalidades ou código removido |
| **Depreciado** | Marcado para remoção futura |

### Formato de Entrada

```markdown
## [YYYY-MM-DD] — Título descritivo

### [TAG] Subcategoria
- Descrição concisa da alteração. Arquivos afetados: `arquivo1.ts`, `arquivo2.tsx`.
```

---

**Regra operacional:** A cada alteração feita no projeto, este changelog deve ser atualizado com a data, tag, subcategoria e descrição dos arquivos afetados.
