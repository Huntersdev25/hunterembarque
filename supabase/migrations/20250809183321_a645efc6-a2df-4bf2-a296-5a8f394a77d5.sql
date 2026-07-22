-- Adicionar colunas para os níveis do DP (Dynamic Positioning)
ALTER TABLE certifications ADD COLUMN dp_dp_basico boolean DEFAULT false;
ALTER TABLE certifications ADD COLUMN dp_dp_avancado boolean DEFAULT false;
ALTER TABLE certifications ADD COLUMN dp_dp_ilimitado boolean DEFAULT false;

-- Adicionar colunas para arquivo DP se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certifications' AND column_name = 'dp_validity') THEN
    ALTER TABLE certifications ADD COLUMN dp_validity date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certifications' AND column_name = 'dp_file_path') THEN
    ALTER TABLE certifications ADD COLUMN dp_file_path text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certifications' AND column_name = 'dp_file_name') THEN
    ALTER TABLE certifications ADD COLUMN dp_file_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certifications' AND column_name = 'dp_indeterminate') THEN
    ALTER TABLE certifications ADD COLUMN dp_indeterminate boolean DEFAULT false;
  END IF;
END
$$;