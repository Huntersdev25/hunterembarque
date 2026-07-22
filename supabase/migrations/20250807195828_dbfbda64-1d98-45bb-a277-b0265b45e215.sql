-- Adicionar campo para armazenar as regras STCW selecionadas
ALTER TABLE certifications 
ADD COLUMN stcw_rules JSONB DEFAULT '{}'::jsonb;