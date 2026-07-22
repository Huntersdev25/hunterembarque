-- Trilha de Cadastro do Profissional (Onboarding Wizard)
-- Adiciona rastreamento de progresso da trilha bloqueante e retomável à tabela profiles.
--
-- onboarding_step         : última etapa alcançada pelo profissional (retomada).
-- onboarding_data         : estado da trilha (ex.: certs_answered = certificações já
--                           endereçadas, incluindo as marcadas como "não possuo").
-- onboarding_completed_at : carimbo de conclusão da trilha (null enquanto pendente).
--
-- Nenhuma política RLS nova é necessária: o próprio usuário já pode atualizar seu
-- perfil (profiles) através das políticas existentes.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.onboarding_step IS 'Última etapa alcançada na trilha de cadastro (retomada).';
COMMENT ON COLUMN public.profiles.onboarding_data IS 'Estado da trilha de cadastro (certs_answered, flags auxiliares).';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Momento em que a trilha de cadastro foi concluída.';
