-- Adicionar colunas indeterminate para todas as certificações que não têm
-- (já existem dp_indeterminate e cir_indeterminate)

ALTER TABLE public.certifications 
ADD COLUMN IF NOT EXISTS stcw_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS caaq_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tbs1_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cbsp_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS thuet_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS alph_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS espe_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS esrs_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ebps_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ecin_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ecia_caci_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ebcp_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS eopn_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS epsm_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cess_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cerr_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS efnt_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ebpq_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ebgl_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS esop_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cns014_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lpn_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gmdss_indeterminate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cft_indeterminate boolean DEFAULT false;