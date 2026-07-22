-- Adicionar todas as colunas de certificação que estão faltando na tabela certifications

-- Adicionar colunas de validade que podem estar faltando
ALTER TABLE public.certifications 
ADD COLUMN IF NOT EXISTS stcw_validity DATE,
ADD COLUMN IF NOT EXISTS alph_issue_date DATE,
ADD COLUMN IF NOT EXISTS ecia_caci_issue_date DATE;

-- Verificar e corrigir todos os campos de certificação para garantir consistência
DO $$
DECLARE
    cert_fields TEXT[] := ARRAY[
        'stcw', 'stcw_issue_date', 'stcw_validity', 'stcw_file_path', 'stcw_file_name',
        'cerr', 'cerr_issue_date', 'cerr_validity', 'cerr_file_path', 'cerr_file_name',
        'efnt', 'efnt_issue_date', 'efnt_validity', 'efnt_file_path', 'efnt_file_name',
        'ebpq', 'ebpq_issue_date', 'ebpq_validity', 'ebpq_file_path', 'ebpq_file_name',
        'ebgl', 'ebgl_issue_date', 'ebgl_validity', 'ebgl_file_path', 'ebgl_file_name',
        'esop', 'esop_issue_date', 'esop_validity', 'esop_file_path', 'esop_file_name',
        'cns014', 'cns014_issue_date', 'cns014_validity', 'cns014_file_path', 'cns014_file_name',
        'lpn', 'lpn_issue_date', 'lpn_validity', 'lpn_file_path', 'lpn_file_name',
        'gmdss', 'gmdss_issue_date', 'gmdss_validity', 'gmdss_file_path', 'gmdss_file_name',
        'cft', 'cft_issue_date', 'cft_validity', 'cft_file_path', 'cft_file_name',
        'caaq', 'caaq_issue_date', 'caaq_validity', 'caaq_file_path', 'caaq_file_name',
        'cbsp', 'cbsp_issue_date', 'cbsp_validity', 'cbsp_file_path', 'cbsp_file_name',
        'tbs1', 'tbs1_issue_date', 'tbs1_validity', 'tbs1_file_path', 'tbs1_file_name',
        'cir', 'cir_issue_date', 'cir_validity', 'cir_file_path', 'cir_file_name',
        'thuet', 'thuet_issue_date', 'thuet_validity', 'thuet_file_path', 'thuet_file_name',
        'alph', 'alph_issue_date', 'alph_validity', 'alph_file_path', 'alph_file_name',
        'espe', 'espe_issue_date', 'espe_validity', 'espe_file_path', 'espe_file_name',
        'esrs', 'esrs_issue_date', 'esrs_validity', 'esrs_file_path', 'esrs_file_name',
        'ebps', 'ebps_issue_date', 'ebps_validity', 'ebps_file_path', 'ebps_file_name',
        'ecin', 'ecin_issue_date', 'ecin_validity', 'ecin_file_path', 'ecin_file_name',
        'ecia_caci', 'ecia_caci_issue_date', 'ecia_caci_validity', 'ecia_caci_file_path', 'ecia_caci_file_name',
        'ebcp', 'ebcp_issue_date', 'ebcp_validity', 'ebcp_file_path', 'ebcp_file_name',
        'eopn', 'eopn_issue_date', 'eopn_validity', 'eopn_file_path', 'eopn_file_name',
        'epsm', 'epsm_issue_date', 'epsm_validity', 'epsm_file_path', 'epsm_file_name',
        'cess', 'cess_issue_date', 'cess_validity', 'cess_file_path', 'cess_file_name'
    ];
    field_name TEXT;
    column_type TEXT;
BEGIN
    FOREACH field_name IN ARRAY cert_fields LOOP
        -- Determinar o tipo da coluna baseado no sufixo
        IF field_name LIKE '%_issue_date' OR field_name LIKE '%_validity' THEN
            column_type := 'DATE';
        ELSIF field_name LIKE '%_file_path' OR field_name LIKE '%_file_name' THEN
            column_type := 'TEXT';
        ELSE
            column_type := 'BOOLEAN DEFAULT false';
        END IF;
        
        -- Adicionar coluna se não existir
        EXECUTE format('ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS %I %s', field_name, column_type);
    END LOOP;
END $$;

-- Comentário sobre as colunas
COMMENT ON TABLE public.certifications IS 'Tabela completa de certificações marítimas com todos os campos necessários para cada tipo de certificação';