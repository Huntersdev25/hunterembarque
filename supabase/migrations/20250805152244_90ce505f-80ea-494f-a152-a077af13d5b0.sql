-- Adicionar tabela para funções pré-cadastradas
CREATE TABLE public.job_functions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Adicionar campos de certificações exigidas na tabela jobs
ALTER TABLE public.jobs 
ADD COLUMN required_certifications JSONB DEFAULT '[]'::jsonb;

-- Adicionar campos de endereço na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN cep TEXT,
ADD COLUMN street TEXT,
ADD COLUMN neighborhood TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN address_number TEXT,
ADD COLUMN address_complement TEXT;

-- Adicionar trigger para atualizar updated_at em job_functions
CREATE TRIGGER update_job_functions_updated_at
  BEFORE UPDATE ON public.job_functions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS para job_functions
ALTER TABLE public.job_functions ENABLE ROW LEVEL SECURITY;

-- Políticas para job_functions
CREATE POLICY "Todos podem ver funções ativas" 
ON public.job_functions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins podem gerenciar funções" 
ON public.job_functions 
FOR ALL 
USING (is_admin(auth.uid()));

-- Inserir algumas funções padrão
INSERT INTO public.job_functions (name, description) VALUES
('Capitão', 'Responsável pelo comando da embarcação'),
('Primeiro Oficial', 'Auxiliar do capitão nas operações náuticas'),
('Segundo Oficial', 'Oficial responsável pela navegação e segurança'),
('Terceiro Oficial', 'Oficial júnior de navegação'),
('Chefe de Máquinas', 'Responsável pelo departamento de máquinas'),
('Primeiro Engenheiro', 'Auxiliar do chefe de máquinas'),
('Segundo Engenheiro', 'Engenheiro responsável por sistemas específicos'),
('Terceiro Engenheiro', 'Engenheiro júnior'),
('Eletrotécnico', 'Responsável pelos sistemas elétricos'),
('Contramestre', 'Supervisor do pessoal de convés'),
('Marinheiro', 'Tripulante de convés'),
('Motorista', 'Operador de equipamentos de convés'),
('Cozinheiro', 'Responsável pela alimentação da tripulação'),
('Camareiro', 'Responsável pela limpeza e arrumação');