-- Add new status values to application_status enum
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'aprovado';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'rejeitado';