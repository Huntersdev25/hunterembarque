-- Adicionar coluna para motivo de reprovação na tabela applications
ALTER TABLE applications ADD COLUMN rejection_reason TEXT;