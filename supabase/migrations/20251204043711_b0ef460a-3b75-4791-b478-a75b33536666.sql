-- Create table for cost control per approved professional
CREATE TABLE public.professional_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_candidate_id uuid NOT NULL REFERENCES public.client_candidates(id) ON DELETE CASCADE,
  daily_rate numeric(10,2),
  total_days integer,
  total_cost numeric(12,2),
  transportation_cost numeric(10,2) DEFAULT 0,
  food_cost numeric(10,2) DEFAULT 0,
  accommodation_cost numeric(10,2) DEFAULT 0,
  other_costs numeric(10,2) DEFAULT 0,
  other_costs_description text,
  payment_status text DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'parcial', 'pago')),
  invoice_number text,
  invoice_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Create table for legal requirements tracking
CREATE TABLE public.legal_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_candidate_id uuid NOT NULL REFERENCES public.client_candidates(id) ON DELETE CASCADE,
  
  -- FGTS
  fgts_status text DEFAULT 'pendente' CHECK (fgts_status IN ('pendente', 'em_dia', 'atrasado', 'nao_aplicavel')),
  fgts_last_payment date,
  fgts_file_path text,
  fgts_file_name text,
  fgts_notes text,
  
  -- INSS
  inss_status text DEFAULT 'pendente' CHECK (inss_status IN ('pendente', 'em_dia', 'atrasado', 'nao_aplicavel')),
  inss_last_payment date,
  inss_file_path text,
  inss_file_name text,
  inss_notes text,
  
  -- ASO (Atestado de Saúde Ocupacional)
  aso_status text DEFAULT 'pendente' CHECK (aso_status IN ('pendente', 'valido', 'vencido', 'nao_aplicavel')),
  aso_validity date,
  aso_file_path text,
  aso_file_name text,
  aso_notes text,
  
  -- EPIs (Equipamentos de Proteção Individual)
  epi_status text DEFAULT 'pendente' CHECK (epi_status IN ('pendente', 'entregue', 'incompleto', 'nao_aplicavel')),
  epi_delivery_date date,
  epi_file_path text,
  epi_file_name text,
  epi_items text[], -- Array of EPI items delivered
  epi_notes text,
  
  -- Salários
  salary_status text DEFAULT 'pendente' CHECK (salary_status IN ('pendente', 'pago', 'atrasado', 'nao_aplicavel')),
  salary_last_payment date,
  salary_amount numeric(10,2),
  salary_file_path text,
  salary_file_name text,
  salary_notes text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Create indexes
CREATE INDEX idx_professional_costs_client_candidate ON public.professional_costs(client_candidate_id);
CREATE INDEX idx_legal_requirements_client_candidate ON public.legal_requirements(client_candidate_id);

-- Enable RLS
ALTER TABLE public.professional_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for professional_costs
CREATE POLICY "Admins can manage professional_costs"
ON public.professional_costs FOR ALL
USING (is_admin(auth.uid()) OR is_current_user_ti());

CREATE POLICY "Clients can view their professional_costs"
ON public.professional_costs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_candidates cc
    JOIN clients c ON cc.client_id = c.id
    WHERE cc.id = professional_costs.client_candidate_id
    AND c.user_id = auth.uid()
  )
);

-- RLS Policies for legal_requirements
CREATE POLICY "Admins can manage legal_requirements"
ON public.legal_requirements FOR ALL
USING (is_admin(auth.uid()) OR is_current_user_ti());

CREATE POLICY "Clients can view their legal_requirements"
ON public.legal_requirements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_candidates cc
    JOIN clients c ON cc.client_id = c.id
    WHERE cc.id = legal_requirements.client_candidate_id
    AND c.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_professional_costs_updated_at
BEFORE UPDATE ON public.professional_costs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_requirements_updated_at
BEFORE UPDATE ON public.legal_requirements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();