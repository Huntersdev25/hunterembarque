-- =====================================================================
-- Catálogo oficial de funções + múltiplas funções por profissional
-- =====================================================================
-- 1) profiles.functions: lista das funções que o profissional exerce
--    (o admin gerencia; desired_function continua sendo a função principal).
-- 2) Desativa as funções genéricas do seed inicial.
-- 3) Insere as 17 funções oficiais (name = PT, description = equivalente EN).
--
-- Aplicar via Supabase SQL Editor ou `supabase db push`. Idempotente.
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS functions text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.functions IS
  'Funções que o profissional exerce (nomes do catálogo job_functions). desired_function segue como a função principal.';

-- Desativa as funções genéricas do seed original (mantém histórico, some dos seletores).
UPDATE public.job_functions SET is_active = false
 WHERE name IN (
   'Capitão','Primeiro Oficial','Segundo Oficial','Terceiro Oficial',
   'Chefe de Máquinas','Primeiro Engenheiro','Segundo Engenheiro','Terceiro Engenheiro',
   'Eletrotécnico','Contramestre','Marinheiro','Motorista','Cozinheiro','Camareiro'
 );

-- Catálogo oficial. name = português (exibido/usado no match); description = inglês.
INSERT INTO public.job_functions (name, description) VALUES
  ('Assistente Técnico de Segurança',   'ASSISTANT SAFETY OFFICER'),
  ('Assistente Técnico de Materiais',   'ASSISTANT STOREKEEPER'),
  ('CDM - Condutor Bombeador',          'CARGO OPERATOR'),
  ('1ON - Supervisor de Carga',         'CARGO SUPV'),
  ('GDD - Guindasteiro',                'CRANE DRIVER'),
  ('Técnico Eletricista',               'ELECTRICAL TECH'),
  ('MCB - Mestre de Cabotagem',         'GP FOREMAN'),
  ('Homem de Área',                     'GP OPERATOR'),
  ('MNC - Marinheiro de Convés',        'GP OPERATOR AB'),
  ('Técnico de Instrumentação',         'INSTRUMENT TECH'),
  ('Técnico de Laboratório',            'LABORATORY TECH'),
  ('2OM - Segundo Oficial de Máquinas', 'MAINTENANCE OPERATOR'),
  ('Técnico de Mecânica',               'MECHANICAL TECH'),
  ('Operador de Produção',              'PRODUCTION OPERATOR'),
  ('ROP - Rádio Operador',              'RADIO OPERATOR'),
  ('TST - Técnico de Segurança',        'SAFETY OFFICER'),
  ('Técnico de Materiais',              'STOREKEEPER')
ON CONFLICT (name) DO UPDATE
  SET description = EXCLUDED.description,
      is_active   = true;
