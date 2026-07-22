-- Tabela de embarcações vinculadas a clientes
CREATE TABLE public.measurement_vessels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Tabela de medições de custos por colaborador/embarcação
CREATE TABLE public.measurement_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vessel_id UUID NOT NULL REFERENCES public.measurement_vessels(id) ON DELETE CASCADE,
  collaborator_name TEXT NOT NULL,
  cir TEXT,
  job_function TEXT,
  period_start DATE,
  period_end DATE,
  number_of_days INTEGER DEFAULT 0,
  -- Planos
  monthly_plan NUMERIC(12,2) DEFAULT 0,
  spot_plan NUMERIC(12,2) DEFAULT 0,
  standby_plan NUMERIC(12,2) DEFAULT 0,
  -- Passagens e ajudas
  tickets NUMERIC(12,2) DEFAULT 0,
  boarding_allowance NUMERIC(12,2) DEFAULT 0,
  disembarking_allowance NUMERIC(12,2) DEFAULT 0,
  -- Transporte
  uber_taxi_fuel NUMERIC(12,2) DEFAULT 0,
  -- Hospedagem
  hotel_accommodation NUMERIC(12,2) DEFAULT 0,
  hotel_extras NUMERIC(12,2) DEFAULT 0,
  -- Transporte tripulação
  crew_transport NUMERIC(12,2) DEFAULT 0,
  -- Campos adicionais
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.measurement_vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_costs ENABLE ROW LEVEL SECURITY;

-- Policies para measurement_vessels
CREATE POLICY "Admins can manage measurement_vessels"
ON public.measurement_vessels
FOR ALL
USING (is_admin(auth.uid()) OR is_current_user_ti());

CREATE POLICY "Clients can view their vessels"
ON public.measurement_vessels
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients
  WHERE clients.id = measurement_vessels.client_id
  AND clients.user_id = auth.uid()
));

-- Policies para measurement_costs
CREATE POLICY "Admins can manage measurement_costs"
ON public.measurement_costs
FOR ALL
USING (is_admin(auth.uid()) OR is_current_user_ti());

CREATE POLICY "Clients can view their costs"
ON public.measurement_costs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM measurement_vessels mv
  JOIN clients c ON c.id = mv.client_id
  WHERE mv.id = measurement_costs.vessel_id
  AND c.user_id = auth.uid()
));

-- Triggers para updated_at
CREATE TRIGGER update_measurement_vessels_updated_at
BEFORE UPDATE ON public.measurement_vessels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_measurement_costs_updated_at
BEFORE UPDATE ON public.measurement_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();