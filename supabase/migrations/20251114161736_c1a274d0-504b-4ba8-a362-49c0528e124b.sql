-- Criar tabela de empresas de embarque
CREATE TABLE public.boarding_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de unidades
CREATE TABLE public.boarding_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES boarding_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de colaboradores
CREATE TABLE public.boarding_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES boarding_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tipo enum para status de embarque
CREATE TYPE public.boarding_status AS ENUM ('EM', 'REP', 'DS', 'DEMITIR');

-- Criar tabela de registros de embarque
CREATE TABLE public.boarding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES boarding_employees(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  status boarding_status NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, record_date)
);

-- Enable RLS
ALTER TABLE public.boarding_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_records ENABLE ROW LEVEL SECURITY;

-- Políticas para boarding_companies
CREATE POLICY "Admins podem gerenciar empresas" ON public.boarding_companies
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Clientes podem ver suas empresas" ON public.boarding_companies
  FOR SELECT TO authenticated USING (
    is_client(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Políticas para boarding_units
CREATE POLICY "Admins podem gerenciar unidades" ON public.boarding_units
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Clientes podem ver unidades" ON public.boarding_units
  FOR SELECT TO authenticated USING (
    is_client(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Políticas para boarding_employees
CREATE POLICY "Admins podem gerenciar colaboradores" ON public.boarding_employees
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Clientes podem ver colaboradores" ON public.boarding_employees
  FOR SELECT TO authenticated USING (
    is_client(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clientes podem criar colaboradores" ON public.boarding_employees
  FOR INSERT TO authenticated WITH CHECK (
    is_client(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clientes podem atualizar colaboradores" ON public.boarding_employees
  FOR UPDATE TO authenticated USING (
    is_client(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Políticas para boarding_records
CREATE POLICY "Admins podem gerenciar registros" ON public.boarding_records
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Clientes podem ver registros" ON public.boarding_records
  FOR SELECT TO authenticated USING (
    is_client(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clientes podem criar registros" ON public.boarding_records
  FOR INSERT TO authenticated WITH CHECK (
    is_client(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clientes podem atualizar registros" ON public.boarding_records
  FOR UPDATE TO authenticated USING (
    is_client(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- TI tem acesso total
CREATE POLICY "TI acesso total a empresas" ON public.boarding_companies
  FOR ALL TO authenticated USING (is_current_user_ti());

CREATE POLICY "TI acesso total a unidades" ON public.boarding_units
  FOR ALL TO authenticated USING (is_current_user_ti());

CREATE POLICY "TI acesso total a colaboradores" ON public.boarding_employees
  FOR ALL TO authenticated USING (is_current_user_ti());

CREATE POLICY "TI acesso total a registros" ON public.boarding_records
  FOR ALL TO authenticated USING (is_current_user_ti());

-- Triggers para updated_at
CREATE TRIGGER update_boarding_companies_updated_at
  BEFORE UPDATE ON public.boarding_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boarding_units_updated_at
  BEFORE UPDATE ON public.boarding_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boarding_employees_updated_at
  BEFORE UPDATE ON public.boarding_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boarding_records_updated_at
  BEFORE UPDATE ON public.boarding_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_boarding_units_company_id ON public.boarding_units(company_id);
CREATE INDEX idx_boarding_employees_unit_id ON public.boarding_employees(unit_id);
CREATE INDEX idx_boarding_records_employee_id ON public.boarding_records(employee_id);
CREATE INDEX idx_boarding_records_date ON public.boarding_records(record_date);