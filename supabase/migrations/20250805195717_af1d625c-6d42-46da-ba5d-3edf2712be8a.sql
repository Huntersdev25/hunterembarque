-- Verificar e corrigir políticas RLS para permitir candidatos deletarem suas próprias candidaturas

-- Primeiro, vamos ver as políticas atuais
SELECT * FROM pg_policies WHERE tablename = 'applications';

-- Criar política para permitir que candidatos deletem suas próprias candidaturas
CREATE POLICY "Users can delete their own applications"
ON public.applications
FOR DELETE
USING (auth.uid() = candidate_id);