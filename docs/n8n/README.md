# Automação WhatsApp — instalação

Implementa a [Plataforma de Engajamento WhatsApp](../plataforma-engajamento-whatsapp.md) em **um único workflow n8n** com 6 triggers, enviando por **Evolution API**.

| Arquivo | O que é |
|---|---|
| `00-migration.sql` | Fundação no Supabase: fila, configs anti-ban, templates, opt-out e as funções que o n8n chama |
| `whatsapp-engajamento.json` | O workflow n8n (importável) |
| `FLUXO.md` | **Documentação do fluxo** — o que cada peça faz e por quê |

---

## Passo 1 — Aplicar o SQL

Supabase → **SQL Editor** → cole `00-migration.sql` → Run.

Cria: `message_outbox`, `message_log`, `whatsapp_settings`, `message_templates`, colunas de opt-out em `profiles`, `is_profile_complete()`, `v_incomplete_candidates` e as funções `claim_outbox_batch`, `enqueue_*`, `mark_message_*`, `wa_handle_optout`.

> A lógica crítica mora aqui de propósito: o claim é **atômico** (`FOR UPDATE SKIP LOCKED`), então dois Senders nunca pegam a mesma mensagem.

## Passo 2 — Credencial Postgres no n8n

n8n → **Credentials** → New → *Postgres*. Dados em Supabase → Settings → Database → **Connection string** (use a porta do *Session pooler*, 5432).

- Host / Database / User / Password conforme o painel
- **SSL: `require`**

## Passo 3 — Preparar a Evolution API

1. Crie uma instância e conecte o número lendo o QR Code.
2. Anote: **URL base** (ex.: `https://sua-evolution.com`, sem barra final), **nome da instância** e a **apikey**.
3. Teste fora do n8n antes de seguir:

```bash
curl -X POST "https://sua-evolution.com/message/sendText/hunters" \
  -H "apikey: SUA_APIKEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"5521999999999","text":"teste"}'
```

Se isso não funcionar, o workflow também não vai funcionar — resolva aqui primeiro.

## Passo 4 — Importar o workflow

n8n → **Workflows** → ⋯ → *Import from File* → `whatsapp-engajamento.json`. Depois ajuste:

1. **Todos os nós Postgres** (são 9): selecione a credencial do passo 2 — o JSON vem com `REPLACE_POSTGRES_CRED_ID`.
2. **Nó `Config Evolution`**: `evolution_base_url`, `evolution_instance` e `evolution_apikey`.
3. **Nó `Config Supabase`**: cole a `service_role_key`.

> ⚠️ A `service_role_key` e a `apikey` são secretas. O ideal é guardá-las como credencial/variável do n8n, não como texto no nó.

## Passo 5 — Ligar os webhooks

Ative o workflow e copie as 3 URLs de produção:

| Webhook | Onde cadastrar |
|---|---|
| `/wa-boas-vindas` | Supabase, tabela `system_webhooks` → `webhook_key = 'wa-boas-vindas'` |
| `/wa-vaga-ativada` | Supabase, tabela `system_webhooks` → `webhook_key = 'wa-vaga-ativada'` |
| `/wa-inbound` | Evolution API → **Webhook** → evento **`MESSAGES_UPSERT`** |

Payloads esperados nos dois primeiros (enviados pela edge function `notify-webhook`, que já existe):

```jsonc
// wa-boas-vindas
{ "type": "signup", "data": { "profile_id": "uuid-do-perfil" } }

// wa-vaga-ativada
{ "type": "job_activated", "data": { "job_id": "uuid-da-vaga" } }
```

## Passo 6 — Aquecer o número (não pule)

```sql
SELECT * FROM whatsapp_settings;

-- iniciar hoje: 20 msgs/dia, +20% ao dia, teto 400
UPDATE whatsapp_settings SET
  warmup_start_date    = CURRENT_DATE,
  warmup_initial_daily = 20,
  warmup_growth        = 1.2,
  warmup_max_daily     = 400,
  max_per_hour         = 40;
```

**Teste com a fila desligada primeiro**: `UPDATE whatsapp_settings SET enabled = false;` — os produtores enfileiram, nada é enviado. Confira `message_outbox` (a coluna `body` já vem renderizada e `phone` já vem do Supabase) e só então ligue.

---

## Como operar

```sql
-- o que está na fila
SELECT status, count(*) FROM message_outbox GROUP BY status;

-- próximos envios (com o número que será usado)
SELECT scheduled_for, priority, template_key, phone, left(body,60)
  FROM message_outbox WHERE status='queued'
 ORDER BY priority, scheduled_for LIMIT 20;

-- teto de hoje x já enviado
SELECT wa_daily_cap() AS teto_hoje,
       (SELECT count(*) FROM message_outbox
         WHERE status='sent' AND sent_at::date = CURRENT_DATE) AS enviadas_hoje;

-- quem pediu para sair
SELECT full_name, phone FROM profiles WHERE whatsapp_opt_out;

-- pausar tudo imediatamente
UPDATE whatsapp_settings SET enabled = false;

-- editar o texto das mensagens (sem mexer no n8n)
UPDATE message_templates SET body = '...' WHERE template_key = 'boas_vindas';
```

---

## Mapa do workflow

Cada raia tem um trigger independente — quando um dispara, só o ramo dele roda.

| Raia | Trigger | Faz |
|---|---|---|
| **A · Sender** | Schedule 2 min | Destrava presas → **reserva lote** → loop 1×1 → envia (Evolution) → marca → jitter 8–35s |
| **B · Boas-vindas** | Webhook signup | Enfileira com atraso de 10–40 min |
| **C · Certificados** | Diário 08:12 | Recalcula `certificate_alerts` → enfileira não notificados |
| **D · Abandono** | De hora em hora | Iniciou trilha, >24h, não concluiu (máx 5 lembretes) |
| **E · Vagas** | Webhook vaga | Mesma função **+ perfil completo** + sem opt-out |
| **F · Opt-out** | Webhook `MESSAGES_UPSERT` | Respondeu "SAIR" → bloqueia e cancela a fila dele |

**Nenhum produtor envia nada.** Todos só escrevem na `message_outbox`; só a Raia A fala com o WhatsApp. É isso que segura o ritmo e evita o bloqueio.

👉 Para entender cada peça em detalhe, leia **[FLUXO.md](FLUXO.md)**.

---

## Ainda pendente (fora deste pacote)

- **Fase 2 — chatbot IA**: hoje a Raia F cai num `NoOp` quando a mensagem não é "SAIR". É ali que o agente entra.
- **Links de convite com token** (`/convite/:token`): as funções usam `https://hunterembarque.com/cadastro`. Quando a tabela de convites existir, troque o `link` nas funções `enqueue_*`.
- **Trigger de signup** no app chamando `notify-webhook` com `webhook_key='wa-boas-vindas'`.
