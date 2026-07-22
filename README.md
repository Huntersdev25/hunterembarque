# 🧠 Hunters Manpower – Banco de Talentos

Sistema completo de gestão de profissionais marítimos e offshore, desenvolvido para centralizar perfis de candidatos, gerenciar certificações, controlar embarques e conectar empresas aos melhores talentos do setor.

> **URL de Produção:** [hunterembarque.com](https://hunterembarque.com)

---

## 📌 Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Tipos de Usuários e Rotas](#tipos-de-usuários-e-rotas)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Edge Functions (Backend)](#edge-functions-backend)
- [Banco de Dados](#banco-de-dados)
- [Segurança](#segurança)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Changelog](#changelog)

---

## Visão Geral

O **Banco de Talentos Hunters Manpower** automatiza e otimiza a gestão de candidatos offshore, permitindo que recrutadores tenham uma visão clara dos perfis disponíveis para cada vaga. O sistema gerencia todo o ciclo: cadastro → validação → atribuição a cliente → entrevista → embarque.

---

## Stack Tecnológica

| Camada       | Tecnologia                                              |
|--------------|--------------------------------------------------------|
| Frontend     | React 18, TypeScript, Vite                             |
| Estilização  | Tailwind CSS, shadcn/ui, Framer Motion                 |
| Estado       | TanStack React Query, Context API                      |
| Roteamento   | React Router DOM v6                                    |
| Backend      | Supabase — Auth, Database, Edge Functions, Storage    |
| IA           | AI Gateway (Gemini), ElevenLabs (voz)                  |
| Relatórios   | jsPDF, jspdf-autotable, xlsx, html2canvas              |

---

## Arquitetura

```
┌─────────────────────────────────────────────┐
│              Frontend (React/Vite)          │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Landing  │ │Candidate │ │Admin/TI/    │ │
│  │  Page    │ │Dashboard │ │Client Panel │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
└───────────────────┬─────────────────────────┘
                    │ Supabase Client SDK
┌───────────────────▼─────────────────────────┐
│                 Supabase                    │
│  ┌──────┐ ┌────────┐ ┌───────┐ ┌────────┐  │
│  │ Auth │ │Database│ │Storage│ │Edge Fn │  │
│  │      │ │(Postgres)│      │ │(Deno)  │  │
│  └──────┘ └────────┘ └───────┘ └────────┘  │
└─────────────────────────────────────────────┘
```

---

## Tipos de Usuários e Rotas

### 👤 Candidato (Profissional)
Prefixo: `/` (rotas diretas)

| Rota             | Página                    |
|------------------|--------------------------|
| `/candidate`     | Dashboard do candidato    |
| `/profile`       | Perfil e certificações    |
| `/settings`      | Configurações pessoais    |
| `/applications`  | Candidaturas enviadas     |
| `/jobs`          | Vagas disponíveis         |
| `/vagas`         | Vagas públicas (sem auth) |
| `/vagas/:jobId`  | Detalhes da vaga          |

### 🛡️ Administrador
Prefixo: `/a`

| Rota               | Página                         |
|--------------------|-------------------------------|
| `/a`               | Dashboard admin               |
| `/a/vagas`         | Gestão de vagas               |
| `/a/profissionais` | Candidatos cadastrados        |
| `/a/empresas`      | Clientes/empresas             |
| `/a/solicitacoes`  | Solicitações de profissionais |
| `/a/validados`     | Profissionais validados       |
| `/a/embarque`      | Controle de embarque          |
| `/a/controle`      | Controle de requisitos        |
| `/a/operacional`   | Gestão operacional            |
| `/a/medicoes`      | Medições de custos            |
| `/a/rancho`        | Controle de rancho            |
| `/a/tarefas`       | Tarefas com webhook           |
| `/a/central-ia`    | Central de agentes IA         |
| `/a/novo-admin`    | Criar novo administrador      |
| `/a/credenciais`   | Funções de cargo              |
| `/a/config`        | Configurações do admin        |

### 🏢 Cliente (Empresa)
Prefixo: `/c`

| Rota                     | Página                        |
|--------------------------|------------------------------|
| `/c/painel`              | Dashboard do cliente         |
| `/c/solicitacoes`        | Solicitações de profissionais|
| `/c/aprovados`           | Candidatos aprovados         |
| `/c/aprovados/:id`       | Detalhes do candidato        |
| `/c/embarque`            | Controle de embarque         |
| `/c/por-usuario`         | Candidatos por usuário       |

### 🔧 TI (Suporte Técnico)
Prefixo: `/s`

| Rota              | Página                    |
|-------------------|--------------------------|
| `/s/painel`       | Dashboard TI             |
| `/s/usuarios`     | Gestão de usuários       |
| `/s/vagas`        | Vagas (visão TI)         |
| `/s/banco`        | Banco de dados           |
| `/s/atividades`   | Logs de atividade        |
| `/s/metricas`     | Analytics                |
| `/s/config`       | Configurações            |
| `/s/visibilidade` | Controle de visibilidade |
| `/s/hooks`        | Webhooks                 |
| `/s/empresas`     | Clientes (visão TI)      |
| `/s/alertas`      | Notificações             |
| `/s/conexoes`     | Integrações              |
| `/s/permissoes`   | Matriz de permissões     |
| `/s/novo-ti`      | Criar usuário TI         |
| `/s/novo-admin`   | Criar administrador      |

---

## Funcionalidades Principais

### Candidatos
- Cadastro com dados completos (contato, habilidades, currículo, pretensão salarial)
- Upload de certificações marítimas (CIR, STCW, CBSP, THUET, DP, GMDSS, etc.)
- Upload de documentos e vídeo de apresentação
- Busca e candidatura em vagas
- Dashboard com status de candidaturas
- Exportação de perfil em PDF

### Administradores
- Dashboard com estatísticas (candidatos, vagas, candidaturas)
- CRUD de vagas com requisitos de certificação
- Gestão de candidatos com filtros avançados
- Atribuição de candidatos a clientes/vagas
- Controle de embarque (empresas, unidades, funcionários)
- Gestão operacional (diárias, cancelamentos, encargos)
- Medições de custos por embarcação
- Tarefas com integração webhook
- Central de agentes IA (Hunters IO)
- Chat IA para suporte interno
- Relatórios exportáveis (PDF, Excel)

### Clientes
- Dashboard com profissionais atribuídos
- Avaliação de candidatos (entrevista)
- Controle de documentos por profissional
- Solicitações de novos profissionais
- Controle de embarque (visão cliente)

### TI
- Gestão completa de usuários (criar admin, TI, candidatos)
- Logs de auditoria
- Analytics do sistema
- Webhooks e integrações
- Controle de visibilidade de dados
- Verificação de segurança (2FA com código)

---

## Edge Functions (Backend)

Todas as Edge Functions rodam em Deno (Supabase Edge Functions) com validação via `zod`.

| Função                      | Descrição                                           |
|-----------------------------|-----------------------------------------------------|
| `admin-chat`                | Chat IA para admins (streaming via AI Gateway)       |
| `analyze-profile`           | Análise de perfil de candidato via IA               |
| `calculate-match-score`     | Cálculo de match entre candidato e vaga             |
| `check-certificate-alerts`  | Verificação de validade de certificações            |
| `cleanup-orphaned-data`     | Limpeza de dados órfãos                             |
| `create-admin`              | Criação de admin (com verificação de permissão)     |
| `create-candidate`          | Criação de candidato                                |
| `create-client`             | Criação de cliente/empresa                          |
| `create-company-user`       | Criação de usuário vinculado a empresa              |
| `create-first-ti-user`      | Criação do primeiro usuário TI                      |
| `create-secure-admin`       | Criação segura de admin (com auditoria)             |
| `create-ti-user`            | Criação de usuário TI                               |
| `delete-client`             | Exclusão de cliente                                 |
| `delete-user`               | Exclusão de usuário (cascade em todas as tabelas)   |
| `elevenlabs-scribe-token`   | Token para integração ElevenLabs (voz)              |
| `generate-reports`          | Geração de relatórios                               |
| `manage-applications`       | Gestão de candidaturas (status, notas)              |
| `n8n-chat`                  | Proxy para chat n8n                                 |
| `notify-candidate-status`   | Notificação de mudança de status do candidato       |
| `notify-webhook`            | Envio de notificações via webhook                   |
| `send-notification`         | Envio de notificações internas                      |
| `send-ti-verification-code` | Envio de código de verificação TI                   |
| `setup-ti-admin`            | Setup inicial do admin TI                           |

---

## Banco de Dados

### Tabelas Principais

| Tabela                        | Descrição                                      |
|-------------------------------|------------------------------------------------|
| `profiles`                    | Perfis de candidatos                           |
| `certifications`              | Certificações marítimas dos candidatos         |
| `jobs`                        | Vagas de emprego                               |
| `job_functions`               | Funções de cargo disponíveis                   |
| `applications`                | Candidaturas a vagas                           |
| `job_match_scores`            | Scores de match candidato×vaga                 |
| `administrators`              | Administradores do sistema                     |
| `ti_users`                    | Usuários de TI                                 |
| `clients`                     | Empresas clientes                              |
| `company_users`               | Usuários de empresas clientes                  |
| `client_candidates`           | Atribuições de candidatos a clientes           |
| `client_candidate_visibility` | Controle de visibilidade de dados por candidato|
| `client_candidate_documents`  | Documentos por atribuição candidato-cliente    |
| `boarding_companies`          | Empresas de embarque                           |
| `boarding_units`              | Unidades/embarcações                           |
| `boarding_employees`          | Funcionários embarcados                        |
| `legal_requirements`          | Requisitos legais (ASO, EPI, FGTS, INSS)       |
| `certificate_alerts`          | Alertas de vencimento de certificações         |
| `measurement_vessels`         | Embarcações para medição de custos             |
| `measurement_costs`           | Custos operacionais por embarcação             |
| `notifications`               | Notificações do sistema                        |
| `audit_logs`                  | Logs de auditoria                              |
| `agent_covers`                | Capas de agentes IA                            |
| `chats`                       | Registros de chats do WhatsApp                 |
| `n8n_chat_histories`          | Histórico de chats do n8n                      |

---

## Segurança

- **RLS (Row Level Security)** habilitado em todas as tabelas
- **Políticas por role**: admin, TI, candidato, cliente
- **Validação de entrada** com `zod` em todas as Edge Functions
- **Autenticação** via Supabase Auth (email/senha)
- **Verificação 2FA** para acesso TI (código de verificação)
- **Auditoria** completa de ações administrativas (`audit_logs`)
- **CORS** configurado em todas as Edge Functions
- **Service Role** usado apenas em operações privilegiadas (Edge Functions)
- **Rotas ofuscadas** para painéis admin (`/a`), cliente (`/c`) e TI (`/s`)
- **Cache de role** com expiração de 5 minutos

---

## Estrutura de Pastas

```
├── public/                     # Assets estáticos
│   ├── lovable-uploads/        # Uploads de imagens
│   └── favicon.ico
├── src/
│   ├── assets/                 # Imagens e assets importados
│   │   └── ai-cards/           # Capas dos agentes IA
│   ├── components/
│   │   ├── ui/                 # Componentes shadcn/ui
│   │   ├── landing/            # Seções da landing page
│   │   ├── ti/                 # Componentes do painel TI
│   │   └── gestao-operacional/ # Componentes de gestão operacional
│   ├── contexts/               # Context providers (Auth)
│   ├── hooks/                  # Custom hooks
│   ├── integrations/supabase/  # Cliente e tipos do Supabase
│   ├── lib/                    # Utilitários (utils, phone, CEP)
│   ├── pages/                  # Páginas da aplicação
│   ├── App.tsx                 # Roteamento principal
│   ├── main.tsx                # Entry point
│   └── index.css               # Tokens de design (CSS variables)
├── supabase/
│   ├── functions/              # Edge Functions (Deno)
│   ├── migrations/             # Migrações do banco
│   └── config.toml             # Configuração do Supabase
├── tailwind.config.ts          # Configuração do Tailwind
├── vite.config.ts              # Configuração do Vite
└── README.md                   # Este arquivo
```

---

## Changelog

### 2026-02-24

#### Segurança — Correção de RLS e validação
- Removidas políticas RLS permissivas (`"geral"` com `USING(true)`) das tabelas `chats` e `jobs`
- Corrigidas políticas da tabela `ti_verification_codes` para restringir a TI e próprio usuário
- Política de INSERT em `audit_logs` restrita a admin/TI
- Política de INSERT em `n8n_chat_histories` restrita a usuários autenticados
- Adicionado `SET search_path TO 'public'` na função `check_certificate_validity()`
- Adicionada validação de entrada com `zod` em todas as Edge Functions

#### Tarefas — Webhook com datas separadas
- Webhook de criação de tarefa agora envia `start_date` e `due_date` como campos separados no payload

#### Edge Functions — Correção de respostas de erro
- Todas as Edge Functions agora retornam HTTP 200 com `{ success: false, error: "..." }` em vez de HTTP 400
- Corrige o problema onde o SDK do Supabase (`functions.invoke`) tratava respostas 400 como erro genérico ("Edge Function returned a non-2xx status code"), ocultando a mensagem real de erro
- Funções corrigidas: `create-admin`, `create-ti-user`, `create-first-ti-user`, `create-secure-admin`, `create-company-user`, `create-client`, `delete-client`, `delete-user`, `setup-ti-admin`, `send-ti-verification-code`, `n8n-chat`

#### Sidebar Admin — Reorganização + Página KPIs
- Movidos "Custos e Requisitos" e "Gestão Operacional" da categoria **Operacional** para **Embarque**
- Adicionada página **KPIs** na categoria **Clientes** (`/a/kpis`) com:
  - Filtros por cliente e período (7d, 15d, 30d, 60d, 90d, 1 ano)
  - 8 KPI cards: Candidatos Enviados, Vagas Ativas, Candidaturas, Taxa de Conversão, Pendentes, Em Entrevista, Aprovados, Rejeitados
  - Pipeline de ASO (Pendente → Marcado → Finalizado)
  - Gráfico de área: timeline de candidatos enviados por semana
  - Gráfico de pizza: distribuição por status de entrevista
  - Gráfico de barras horizontal: candidatos por cliente (top 10)
  - Gráfico de barras: distribuição por função
  - Tabela resumo por cliente com tipo, enviados, pendentes, aprovados, rejeitados e status

---

*Documentação mantida automaticamente. Cada alteração no sistema é registrada na seção [Changelog](#changelog).*
