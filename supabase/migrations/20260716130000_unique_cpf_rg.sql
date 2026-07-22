-- Unicidade de CPF e RG entre perfis
-- ----------------------------------------------------------------------------
-- Impede que dois perfis tenham o mesmo CPF ou o mesmo RG. A comparação é feita
-- sobre o valor NORMALIZADO (apenas dígitos no CPF; dígitos + "X" no RG), para
-- que "123.456.789-00" e "12345678900" sejam tratados como iguais.
--
-- ATENÇÃO: se já existirem duplicatas na base, a criação do índice único falha.
-- Nesse caso, deduplique os registros antes de aplicar esta migração.

-- CPF único (ignora nulos/vazios)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique_idx
  ON public.profiles (regexp_replace(cpf, '\D', '', 'g'))
  WHERE cpf IS NOT NULL AND btrim(cpf) <> '';

-- RG único (ignora nulos/vazios)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_rg_unique_idx
  ON public.profiles (upper(regexp_replace(rg, '[^0-9Xx]', '', 'g')))
  WHERE rg IS NOT NULL AND btrim(rg) <> '';

-- Checagem amigável (usada pelo front antes de salvar).
-- SECURITY DEFINER para verificar contra TODOS os perfis, respeitando o RLS
-- (retorna apenas booleanos, nunca dados de terceiros).
CREATE OR REPLACE FUNCTION public.check_documents_unique(
  p_cpf text,
  p_rg text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'cpf_taken',
      CASE WHEN p_cpf IS NULL OR btrim(p_cpf) = '' THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.profiles
        WHERE regexp_replace(cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g')
          AND user_id <> p_user_id
      ) END,
    'rg_taken',
      CASE WHEN p_rg IS NULL OR btrim(p_rg) = '' THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.profiles
        WHERE upper(regexp_replace(rg, '[^0-9Xx]', '', 'g')) = upper(regexp_replace(p_rg, '[^0-9Xx]', '', 'g'))
          AND user_id <> p_user_id
      ) END
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_documents_unique(text, text, uuid) TO authenticated;
