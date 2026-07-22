INSERT INTO public.system_webhooks (name, webhook_key, webhook_url, is_active, description)
VALUES (
  'Notificação de Tarefas',
  'notify-webhook',
  'https://n8n-n8n.ooqqkc.easypanel.host/webhook/20da9264-69f2-48bf-ab22-18e676fc8aa6',
  true,
  'Webhook para envio de notificações de tarefas criadas'
)
ON CONFLICT (webhook_key) DO UPDATE SET
  webhook_url = EXCLUDED.webhook_url,
  updated_at = now();