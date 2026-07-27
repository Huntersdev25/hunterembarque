-- =====================================================================
-- Plataforma de Engajamento WhatsApp — FASE 0 (fundação)
-- =====================================================================
-- Cria a fila de saída (message_outbox), configurações anti-ban,
-- templates de mensagem, opt-out (LGPD) e as funções que os workflows
-- do n8n chamam.
--
-- Princípio: as REGRAS CRÍTICAS ficam aqui (atômicas, sem corrida).
-- O n8n só orquestra e faz o HTTP para a Evolution API.
--
-- Aplicar via Supabase SQL Editor ou `supabase db push`.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. TRAVA DE SEGURANÇA — confirma que este é o banco DO APP
-- ---------------------------------------------------------------------
-- A automação depende de profiles.phone (destinatário), profiles.user_id
-- (chave de auth) e da tabela certifications. Se algo disso faltar, você está
-- conectado a OUTRO projeto Supabase — instalar aqui criaria uma automação que
-- nunca poderá enviar nada. Melhor falhar agora, com mensagem clara.
DO $$
DECLARE
  faltando text[] := '{}';
  c        text;
BEGIN
  FOREACH c IN ARRAY ARRAY['phone','user_id','full_name','role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='profiles' AND column_name=c) THEN
      faltando := faltando || c;
    END IF;
  END LOOP;

  IF to_regclass('public.certifications') IS NULL THEN
    faltando := faltando || 'tabela certifications';
  END IF;

  IF array_length(faltando,1) > 0 THEN
    RAISE EXCEPTION
      E'BANCO ERRADO.\n'
      'Faltam em public.profiles: %.\n'
      'Este NAO parece ser o banco do app Hunters (la, profiles.phone e NOT NULL).\n'
      'Confira o project ref na URL do dashboard: deve ser augeppwihhzibvhzibxe.\n'
      'Nada foi alterado.', array_to_string(faltando, ', ');
  END IF;

  RAISE NOTICE 'Banco validado: profiles tem phone, user_id, full_name, role e certifications existe.';
END $$;

-- ---------------------------------------------------------------------
-- 1. Colunas necessárias em profiles
-- ---------------------------------------------------------------------

-- 1a. Opt-out / consentimento (LGPD)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_at timestamptz;

COMMENT ON COLUMN public.profiles.whatsapp_opt_out IS
  'True quando o profissional pediu para não receber mais mensagens (respondeu SAIR).';

-- 1b. Progresso da Trilha de Cadastro.
--     A view v_incomplete_candidates e o fluxo #3 dependem de onboarding_step.
--     Estas colunas vêm da migração 20260716120000_add_onboarding_progress.sql,
--     que pode ainda não ter sido aplicada — daí o IF NOT EXISTS (inofensivo se já existir).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step         smallint    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_data         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- ---------------------------------------------------------------------
-- 2. Configurações do disparador (linha única, editável sem deploy)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id                       boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled                  boolean NOT NULL DEFAULT true,

  -- janela comercial (no timezone abaixo)
  timezone                 text    NOT NULL DEFAULT 'America/Sao_Paulo',
  window_start             time    NOT NULL DEFAULT '09:00',
  window_end               time    NOT NULL DEFAULT '20:00',
  send_on_weekends         boolean NOT NULL DEFAULT false,

  -- tetos
  max_per_hour             integer NOT NULL DEFAULT 40,

  -- rampa de aquecimento do número (warm-up)
  warmup_start_date        date    NOT NULL DEFAULT CURRENT_DATE,
  warmup_initial_daily     integer NOT NULL DEFAULT 20,
  warmup_growth            numeric NOT NULL DEFAULT 1.2,
  warmup_max_daily         integer NOT NULL DEFAULT 400,

  -- anti-spam por destinatário
  min_gap_hours_per_number integer NOT NULL DEFAULT 20,

  -- ritmo humano
  jitter_min_seconds       integer NOT NULL DEFAULT 8,
  jitter_max_seconds       integer NOT NULL DEFAULT 35,
  batch_size               integer NOT NULL DEFAULT 5,

  -- retentativas
  max_attempts             integer NOT NULL DEFAULT 4
);

INSERT INTO public.whatsapp_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Templates de mensagem (copy editável no banco)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_templates (
  template_key text PRIMARY KEY,
  description  text,
  body         text NOT NULL,          -- usa {{variavel}}
  priority     integer NOT NULL DEFAULT 100,
  is_active    boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.message_templates (template_key, description, body, priority) VALUES
('boas_vindas', 'Fluxo #1 — boas-vindas após cadastro',
 E'Olá, {{primeiro_nome}}! 👋\n\nQue bom ter você na Hunters Manpower. Somos especialistas em conectar profissionais ao setor marítimo e offshore.\n\nPara começar a receber oportunidades, é só concluir seu cadastro:\n{{link}}\n\nQualquer dúvida, é só responder aqui.\n\n_Se não quiser mais receber mensagens, responda SAIR._', 400),

('cadastro_abandonado', 'Fluxo #3 — cadastro iniciado e não concluído',
 E'Oi, {{primeiro_nome}}! Vi que você começou seu cadastro na Hunters e parou no meio do caminho.\n\nFalta pouco para seu perfil ficar visível para as empresas: {{pendencias}}\n\nRetome de onde parou por aqui:\n{{link}}\n\n_Se não quiser mais receber mensagens, responda SAIR._', 200),

('cert_alerta', 'Fluxo #2 — certificado vencendo ou vencido',
 E'Olá, {{primeiro_nome}}! ⚠️\n\nSeu certificado *{{certificado}}* {{situacao}} ({{validade}}).\n\nCertificados em dia são exigidos pelas empresas para embarque. Atualize o seu por aqui:\n{{link}}\n\n_Se não quiser mais receber mensagens, responda SAIR._', 20),

('vaga_match', 'Fluxo #5 — vaga aberta compatível com a função do profissional',
 E'Oi, {{primeiro_nome}}! 🚢\n\nAbriu uma vaga para *{{funcao}}*, que é a sua função:\n\n*{{titulo}}*\n{{resumo}}\n\nVeja os detalhes e candidate-se:\n{{link}}\n\n_Se não quiser mais receber mensagens, responda SAIR._', 300)
ON CONFLICT (template_key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. A FILA
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone           text NOT NULL,
  template_key    text NOT NULL,
  vars            jsonb NOT NULL DEFAULT '{}'::jsonb,
  body            text NOT NULL,              -- já renderizado (auditável antes de enviar)
  scheduled_for   timestamptz NOT NULL DEFAULT now(),
  priority        integer NOT NULL DEFAULT 100, -- menor = mais urgente
  status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','sending','sent','failed','skipped','canceled')),
  attempts        integer NOT NULL DEFAULT 0,
  dedup_key       text UNIQUE,
  provider_msg_id text,
  last_error      text,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_due
  ON public.message_outbox (status, scheduled_for, priority);
CREATE INDEX IF NOT EXISTS idx_outbox_phone_sent
  ON public.message_outbox (phone, sent_at) WHERE status = 'sent';
CREATE INDEX IF NOT EXISTS idx_outbox_profile
  ON public.message_outbox (profile_id);

CREATE TABLE IF NOT EXISTS public.message_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id  uuid REFERENCES public.message_outbox(id) ON DELETE SET NULL,
  profile_id uuid,
  phone      text,
  event      text NOT NULL,        -- sent | failed | skipped | inbound
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_log_created ON public.message_log (created_at DESC);

-- RLS: só admin/TI enxerga (o n8n usa service_role, que ignora RLS)
ALTER TABLE public.message_outbox     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates  ENABLE ROW LEVEL SECURITY;

-- As policies abaixo são só para o APP (painel admin). O n8n usa a service_role,
-- que ignora RLS. Como o mecanismo de admin varia entre ambientes, detectamos
-- em runtime qual existe. Se nenhum existir, as tabelas ficam deny-all para
-- usuários comuns (seguro) e o n8n segue funcionando normalmente.
DO $$
DECLARE
  v_admin_expr text;
  t            text;
BEGIN
  IF to_regprocedure('public.is_admin(uuid)') IS NOT NULL THEN
    v_admin_expr := 'public.is_admin(auth.uid())';
  ELSIF to_regclass('public.administrators') IS NOT NULL THEN
    v_admin_expr := 'EXISTS (SELECT 1 FROM public.administrators a WHERE a.user_id = auth.uid())';
  ELSIF to_regclass('public.user_roles') IS NOT NULL THEN
    v_admin_expr := 'EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = ''admin'')';
  END IF;

  IF v_admin_expr IS NULL THEN
    RAISE NOTICE 'Nenhum mecanismo de admin encontrado. RLS fica deny-all para usuarios comuns; a service_role (n8n) continua funcionando.';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY['message_outbox','message_log','whatsapp_settings','message_templates'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = t AND policyname = 'wa_admin_all'
    ) THEN
      EXECUTE format('CREATE POLICY wa_admin_all ON public.%I FOR ALL USING (%s)', t, v_admin_expr);
    END IF;
  END LOOP;

  RAISE NOTICE 'Policies de admin criadas usando: %', v_admin_expr;
END $$;

-- ---------------------------------------------------------------------
-- 5. Helpers
-- ---------------------------------------------------------------------

-- Normaliza telefone para o formato da Evolution API (só dígitos, com DDI 55)
-- Ex.: '(21) 99999-9999' -> '5521999999999'
CREATE OR REPLACE FUNCTION public.wa_normalize_phone(p_phone text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE d text;
BEGIN
  d := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  IF d = '' THEN RETURN NULL; END IF;
  IF length(d) <= 11 THEN d := '55' || d; END IF;   -- sem DDI → assume Brasil
  RETURN d;
END $$;

-- Substitui {{chave}} pelo valor em vars
CREATE OR REPLACE FUNCTION public.wa_render(p_body text, p_vars jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text; v text; out_text text := p_body;
BEGIN
  FOR k, v IN SELECT key, value FROM jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) LOOP
    out_text := replace(out_text, '{{' || k || '}}', coalesce(v, ''));
  END LOOP;
  RETURN out_text;
END $$;

-- Teto diário atual conforme a rampa de aquecimento
CREATE OR REPLACE FUNCTION public.wa_daily_cap()
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT LEAST(
           s.warmup_max_daily,
           GREATEST(
             s.warmup_initial_daily,
             floor(s.warmup_initial_daily
                   * power(s.warmup_growth, GREATEST(0, CURRENT_DATE - s.warmup_start_date)))::int
           )
         )
  FROM public.whatsapp_settings s WHERE s.id;
$$;

-- ---------------------------------------------------------------------
-- 6. ENFILEIRAR (usado por todos os produtores)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_message(
  p_profile_id   uuid,
  p_template_key text,
  p_vars         jsonb    DEFAULT '{}'::jsonb,
  p_delay        interval DEFAULT '0 minutes',
  p_dedup_key    text     DEFAULT NULL,
  p_priority     integer  DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text;
  v_opt   boolean;
  v_tpl   public.message_templates;
  v_id    uuid;
BEGIN
  SELECT public.wa_normalize_phone(p.phone), coalesce(p.whatsapp_opt_out,false)
    INTO v_phone, v_opt
    FROM public.profiles p WHERE p.id = p_profile_id;

  IF v_phone IS NULL OR v_opt THEN RETURN NULL; END IF;   -- sem telefone ou opt-out

  SELECT * INTO v_tpl FROM public.message_templates
   WHERE template_key = p_template_key AND is_active;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.message_outbox
         (profile_id, phone, template_key, vars, body, scheduled_for, priority, dedup_key)
  VALUES (p_profile_id, v_phone, p_template_key, p_vars,
          public.wa_render(v_tpl.body, p_vars),
          now() + p_delay,
          coalesce(p_priority, v_tpl.priority),
          p_dedup_key)
  ON CONFLICT (dedup_key) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;   -- NULL quando já existia (dedup) — idempotente
END $$;

-- ---------------------------------------------------------------------
-- 7. CLAIM ATÔMICO — o coração anti-ban
-- ---------------------------------------------------------------------
-- Retorna 0..N mensagens já marcadas como 'sending'.
-- FOR UPDATE SKIP LOCKED garante que dois Senders nunca peguem a mesma.
CREATE OR REPLACE FUNCTION public.claim_outbox_batch()
RETURNS SETOF public.message_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s            public.whatsapp_settings;
  v_local      timestamp;
  v_sent_hour  integer;
  v_sent_today integer;
  v_cap        integer;
  v_limit      integer;
BEGIN
  SELECT * INTO s FROM public.whatsapp_settings WHERE id;
  IF NOT FOUND OR NOT s.enabled THEN RETURN; END IF;

  v_local := (now() AT TIME ZONE s.timezone);

  -- janela comercial
  IF v_local::time < s.window_start OR v_local::time >= s.window_end THEN RETURN; END IF;
  -- fim de semana
  IF NOT s.send_on_weekends AND EXTRACT(isodow FROM v_local) >= 6 THEN RETURN; END IF;

  -- teto por hora
  SELECT count(*) INTO v_sent_hour FROM public.message_outbox
   WHERE status = 'sent' AND sent_at > now() - interval '1 hour';
  IF v_sent_hour >= s.max_per_hour THEN RETURN; END IF;

  -- teto diário (rampa de aquecimento)
  v_cap := public.wa_daily_cap();
  SELECT count(*) INTO v_sent_today FROM public.message_outbox
   WHERE status = 'sent'
     AND (sent_at AT TIME ZONE s.timezone)::date = v_local::date;
  IF v_sent_today >= v_cap THEN RETURN; END IF;

  v_limit := LEAST(s.batch_size, s.max_per_hour - v_sent_hour, v_cap - v_sent_today);
  IF v_limit <= 0 THEN RETURN; END IF;

  RETURN QUERY
  WITH cand AS (
    SELECT o.id
      FROM public.message_outbox o
     WHERE o.status = 'queued'
       AND o.scheduled_for <= now()
       -- opt-out (rechecado na hora do envio)
       AND EXISTS (SELECT 1 FROM public.profiles p
                    WHERE p.id = o.profile_id
                      AND coalesce(p.whatsapp_opt_out,false) = false)
       -- gap mínimo por número
       AND NOT EXISTS (SELECT 1 FROM public.message_outbox r
                        WHERE r.phone = o.phone
                          AND r.status = 'sent'
                          AND r.sent_at > now() - make_interval(hours => s.min_gap_hours_per_number))
     ORDER BY o.priority ASC, o.scheduled_for ASC
     LIMIT v_limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.message_outbox o
     SET status = 'sending', attempts = o.attempts + 1, updated_at = now()
    FROM cand
   WHERE o.id = cand.id
  RETURNING o.*;
END $$;

-- ---------------------------------------------------------------------
-- 8. Confirmar / falhar envio
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_message_sent(p_id uuid, p_provider_msg_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.message_outbox
     SET status='sent', sent_at=now(), provider_msg_id=p_provider_msg_id, updated_at=now()
   WHERE id = p_id;

  INSERT INTO public.message_log (outbox_id, profile_id, phone, event, detail)
  SELECT id, profile_id, phone, 'sent', jsonb_build_object('provider_msg_id', p_provider_msg_id)
    FROM public.message_outbox WHERE id = p_id;
END $$;

-- Reagenda com backoff exponencial até max_attempts; depois marca failed.
CREATE OR REPLACE FUNCTION public.mark_message_failed(p_id uuid, p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_attempts integer; v_max integer;
BEGIN
  SELECT attempts INTO v_attempts FROM public.message_outbox WHERE id = p_id;
  SELECT max_attempts INTO v_max FROM public.whatsapp_settings WHERE id;

  IF v_attempts < v_max THEN
    UPDATE public.message_outbox
       SET status='queued',
           scheduled_for = now() + make_interval(mins => power(3, v_attempts)::int),
           last_error = p_error, updated_at = now()
     WHERE id = p_id;
  ELSE
    UPDATE public.message_outbox
       SET status='failed', last_error = p_error, updated_at = now()
     WHERE id = p_id;
  END IF;

  INSERT INTO public.message_log (outbox_id, profile_id, phone, event, detail)
  SELECT id, profile_id, phone, 'failed', jsonb_build_object('error', p_error, 'attempts', v_attempts)
    FROM public.message_outbox WHERE id = p_id;
END $$;

-- Solta mensagens presas em 'sending' (ex.: n8n caiu no meio)
CREATE OR REPLACE FUNCTION public.requeue_stuck_messages()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.message_outbox
     SET status='queued', updated_at=now()
   WHERE status='sending' AND updated_at < now() - interval '15 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ---------------------------------------------------------------------
-- 9. Completude de perfil (regra nova) + view de incompletos
-- ---------------------------------------------------------------------
-- ADAPTATIVA AO SCHEMA (de propósito).
-- O schema real deste projeto diverge das migrações do repositório, então em vez
-- de referenciar colunas fixas (o que quebra a criação da função se alguma não
-- existir), convertemos a linha em jsonb e exigimos APENAS as colunas que de fato
-- existirem neste banco. Colunas ausentes são ignoradas, não tratadas como falha.
--
-- Para ver o que está sendo exigido de verdade aqui:
--   SELECT * FROM public.wa_completeness_debug();
-- Aceita TANTO profiles.id QUANTO profiles.user_id como chave (o schema varia
-- entre ambientes). Toda leitura é via jsonb, então nenhuma coluna ausente
-- quebra a função — nem na criação, nem em execução.
CREATE OR REPLACE FUNCTION public.is_profile_complete(p_key uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  j        jsonb;
  k        text;
  v_id     text;
  v_user   text;
  required text[] := ARRAY[
    -- dados pessoais
    'full_name','cpf','birth_date','gender','phone',
    -- endereço
    'cep','street','address_number','neighborhood','city','state',
    -- profissional
    'desired_function','vessel_type','professional_experience',
    -- documentos
    'cv_file_path'
  ];
BEGIN
  -- tenta por id; se não achar, tenta por user_id (quando a coluna existir)
  EXECUTE 'SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = $1' INTO j USING p_key;

  IF j IS NULL AND EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id')
  THEN
    EXECUTE 'SELECT to_jsonb(p) FROM public.profiles p WHERE p.user_id = $1' INTO j USING p_key;
  END IF;

  IF j IS NULL THEN RETURN false; END IF;

  FOREACH k IN ARRAY required LOOP
    IF j ? k THEN                                   -- só exige se a coluna existir
      IF coalesce(btrim(j ->> k), '') = '' THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;

  v_id   := j ->> 'id';
  v_user := j ->> 'user_id';                        -- NULL se a coluna não existir

  -- certificados: precisa de PELO MENOS UM anexo (genérico p/ as 26 certs).
  -- Casa por user_id OU profile_id, contra id OU user_id do perfil — via jsonb,
  -- para não referenciar colunas que podem não existir.
  RETURN EXISTS (
    SELECT 1
      FROM public.certifications c, jsonb_each_text(to_jsonb(c)) e
     WHERE (
             coalesce(to_jsonb(c) ->> 'user_id',    '') IN (coalesce(v_id,''), coalesce(v_user,''))
          OR coalesce(to_jsonb(c) ->> 'profile_id', '') IN (coalesce(v_id,''), coalesce(v_user,''))
           )
       AND e.key LIKE '%\_file\_path'
       AND coalesce(e.value,'') <> ''
  );
END $$;

-- Diagnóstico: mostra quais requisitos existem neste banco e quais foram ignorados.
CREATE OR REPLACE FUNCTION public.wa_completeness_debug()
RETURNS TABLE (coluna text, existe boolean)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT k AS coluna,
         EXISTS (SELECT 1 FROM information_schema.columns c
                  WHERE c.table_schema='public' AND c.table_name='profiles'
                    AND c.column_name = k) AS existe
    FROM unnest(ARRAY[
      'full_name','cpf','birth_date','gender','phone',
      'cep','street','address_number','neighborhood','city','state',
      'desired_function','vessel_type','professional_experience',
      'cv_file_path'
    ]) AS k;
$$;

-- A view é montada por SQL dinâmico porque as colunas de profiles variam entre
-- ambientes. Colunas ausentes viram constantes (NULL/0) em vez de quebrar o
-- CREATE VIEW, que é validado no momento da criação.
DO $$
DECLARE
  has_user_id boolean;
  has_email   boolean;
  has_onb     boolean;
  has_optout  boolean;
  e_user      text;
  e_email     text;
  e_onb       text;
  e_optout    text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id')          INTO has_user_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='profiles' AND column_name='email')            INTO has_email;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='profiles' AND column_name='onboarding_step')  INTO has_onb;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='profiles' AND column_name='whatsapp_opt_out') INTO has_optout;

  e_user   := CASE WHEN has_user_id THEN 'p.user_id'         ELSE 'p.id'        END;
  e_email  := CASE WHEN has_email   THEN 'p.email'           ELSE 'NULL::text'  END;
  e_onb    := CASE WHEN has_onb     THEN 'p.onboarding_step' ELSE '0'           END;
  e_optout := CASE WHEN has_optout  THEN 'coalesce(p.whatsapp_opt_out,false)' ELSE 'false' END;

  EXECUTE format($v$
    CREATE OR REPLACE VIEW public.v_incomplete_candidates AS
      SELECT p.id          AS profile_id,
             %s            AS user_id,
             p.full_name,
             %s            AS email,
             p.phone,
             %s            AS onboarding_step,
             p.created_at
        FROM public.profiles p
       WHERE p.role::text = 'candidate'
         AND %s = false
         AND NOT coalesce(public.is_profile_complete(%s), false)
  $v$, e_user, e_email, e_onb, e_optout, e_user);

  RAISE NOTICE 'v_incomplete_candidates criada (chave=%, email=%, onboarding_step=%)', e_user, has_email, has_onb;
END $$;

-- ---------------------------------------------------------------------
-- 10. PRODUTORES — cada um é 1 chamada do n8n
-- ---------------------------------------------------------------------

-- #1 Boas-vindas (SLA médio: atraso aleatório de 10–40 min)
CREATE OR REPLACE FUNCTION public.enqueue_welcome(p_profile_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_app text;
BEGIN
  SELECT split_part(full_name,' ',1) INTO v_name FROM public.profiles WHERE id = p_profile_id;
  v_app := 'https://hunterembarque.com/cadastro';

  RETURN public.enqueue_message(
    p_profile_id, 'boas_vindas',
    jsonb_build_object('primeiro_nome', coalesce(v_name,'tudo bem'), 'link', v_app),
    make_interval(mins => 10 + floor(random()*31)::int),   -- 10 a 40 min
    'welcome:' || p_profile_id::text
  );
END $$;

-- #2 Certificados vencendo/vencidos (reaproveita certificate_alerts)
CREATE OR REPLACE FUNCTION public.enqueue_certificate_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; v_id uuid;
BEGIN
  FOR r IN
    SELECT a.id, a.profile_id, a.certification_name, a.validity_date, a.alert_type,
           split_part(p.full_name,' ',1) AS primeiro_nome
      FROM public.certificate_alerts a
      JOIN public.profiles p ON p.id = a.profile_id
     WHERE a.notified_at IS NULL
  LOOP
    v_id := public.enqueue_message(
      r.profile_id, 'cert_alerta',
      jsonb_build_object(
        'primeiro_nome', coalesce(r.primeiro_nome,'tudo bem'),
        'certificado',   r.certification_name,
        'validade',      to_char(r.validity_date,'DD/MM/YYYY'),
        'situacao',      CASE r.alert_type
                           WHEN 'expired'     THEN 'está vencido'
                           WHEN 'expiring_7'  THEN 'vence em menos de 7 dias'
                           WHEN 'expiring_15' THEN 'vence em menos de 15 dias'
                           ELSE 'vence em menos de 30 dias' END,
        'link', 'https://hunterembarque.com/cadastro'),
      '0 minutes',
      'cert:' || r.id::text,
      CASE r.alert_type WHEN 'expired' THEN 10 WHEN 'expiring_7' THEN 20
                        WHEN 'expiring_15' THEN 30 ELSE 40 END
    );
    UPDATE public.certificate_alerts SET notified_at = now() WHERE id = r.id;
    IF v_id IS NOT NULL THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;

-- #3 Cadastro abandonado (iniciou, >24h, não concluiu)
CREATE OR REPLACE FUNCTION public.enqueue_abandoned_onboarding()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; v_id uuid;
BEGIN
  FOR r IN
    SELECT v.profile_id, split_part(v.full_name,' ',1) AS primeiro_nome
      FROM public.v_incomplete_candidates v
     WHERE v.onboarding_step > 0
       AND v.created_at < now() - interval '24 hours'
       -- nunca mandamos esse lembrete nos últimos 3 dias
       AND NOT EXISTS (
         SELECT 1 FROM public.message_outbox o
          WHERE o.profile_id = v.profile_id
            AND o.template_key = 'cadastro_abandonado'
            AND o.created_at > now() - interval '3 days')
       -- no máximo 5 lembretes no total
       AND (SELECT count(*) FROM public.message_outbox o2
             WHERE o2.profile_id = v.profile_id
               AND o2.template_key = 'cadastro_abandonado') < 5
  LOOP
    v_id := public.enqueue_message(
      r.profile_id, 'cadastro_abandonado',
      jsonb_build_object(
        'primeiro_nome', coalesce(r.primeiro_nome,'tudo bem'),
        'pendencias',    'faltam alguns dados e o anexo de certificados',
        'link',          'https://hunterembarque.com/cadastro'),
      '0 minutes',
      'abandono:' || r.profile_id::text || ':' || to_char(now(),'YYYYMMDD')
    );
    IF v_id IS NOT NULL THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;

-- #5 Vagas por função — SÓ perfil completo E mesma função
CREATE OR REPLACE FUNCTION public.enqueue_job_matches(p_job_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j record; r record; n integer := 0; v_id uuid;
BEGIN
  SELECT id, title, description, function_name, is_active
    INTO j FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND OR NOT j.is_active THEN RETURN 0; END IF;

  FOR r IN
    SELECT p.id AS profile_id, split_part(p.full_name,' ',1) AS primeiro_nome
      FROM public.profiles p
     WHERE p.role = 'candidate'
       AND coalesce(p.whatsapp_opt_out,false) = false
       AND lower(btrim(p.desired_function)) = lower(btrim(j.function_name))  -- filtro duro
       AND public.is_profile_complete(p.id)                                  -- só perfil completo
  LOOP
    v_id := public.enqueue_message(
      r.profile_id, 'vaga_match',
      jsonb_build_object(
        'primeiro_nome', coalesce(r.primeiro_nome,'tudo bem'),
        'funcao',        j.function_name,
        'titulo',        j.title,
        'resumo',        left(coalesce(j.description,''), 180),
        'link',          'https://hunterembarque.com/vagas/' || j.id::text),
      -- espalha os envios ao longo do dia (0 a 8h)
      make_interval(mins => floor(random()*480)::int),
      'job:' || j.id::text || ':' || r.profile_id::text
    );
    IF v_id IS NOT NULL THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;

-- ---------------------------------------------------------------------
-- 11. Opt-out por mensagem recebida (fluxo #6)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wa_handle_optout(p_phone text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; v_norm text;
BEGIN
  v_norm := public.wa_normalize_phone(p_phone);

  UPDATE public.profiles
     SET whatsapp_opt_out = true
   WHERE public.wa_normalize_phone(phone) = v_norm;
  GET DIAGNOSTICS n = ROW_COUNT;

  -- cancela o que ainda estava na fila para esse número
  UPDATE public.message_outbox
     SET status='canceled', updated_at=now()
   WHERE phone = v_norm AND status IN ('queued','sending');

  INSERT INTO public.message_log (phone, event, detail)
  VALUES (v_norm, 'inbound', jsonb_build_object('action','opt_out','profiles_updated',n));

  RETURN n;
END $$;

-- =====================================================================
-- FIM
-- =====================================================================
