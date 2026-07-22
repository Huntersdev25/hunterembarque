-- Tabela para controle de visibilidade de campos por client_candidate
-- Administradores controlam quais informações o cliente pode ver
CREATE TABLE public.client_candidate_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_candidate_id UUID NOT NULL REFERENCES public.client_candidates(id) ON DELETE CASCADE,
    -- Campos que podem ser controlados
    show_availability BOOLEAN DEFAULT false,
    show_salary_expectation BOOLEAN DEFAULT false,
    show_certifications BOOLEAN DEFAULT false,
    show_documents BOOLEAN DEFAULT false,
    show_personal_documents BOOLEAN DEFAULT false,
    show_address BOOLEAN DEFAULT false,
    show_professional_experience BOOLEAN DEFAULT false,
    show_contact_info BOOLEAN DEFAULT true,
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_by UUID,
    UNIQUE(client_candidate_id)
);

-- Enable RLS
ALTER TABLE public.client_candidate_visibility ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage visibility"
ON public.client_candidate_visibility
FOR ALL
USING (is_admin(auth.uid()) OR is_current_user_ti())
WITH CHECK (is_admin(auth.uid()) OR is_current_user_ti());

CREATE POLICY "Clients can view their visibility settings"
ON public.client_candidate_visibility
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM client_candidates cc
        JOIN clients c ON cc.client_id = c.id
        WHERE cc.id = client_candidate_visibility.client_candidate_id
        AND (c.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM company_users cu
            WHERE cu.client_id = c.id
            AND cu.user_id = auth.uid()
            AND cu.is_active = true
        ))
    )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_client_candidate_visibility_updated_at
    BEFORE UPDATE ON public.client_candidate_visibility
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar registro de visibilidade automaticamente
-- baseado no tipo do cliente (hunting vs labor_supply)
CREATE OR REPLACE FUNCTION public.create_visibility_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    client_type_value TEXT;
BEGIN
    -- Buscar o tipo do cliente
    SELECT client_type INTO client_type_value
    FROM clients
    WHERE id = NEW.client_id;
    
    -- Se for hunting, visibilidade restrita por padrão
    IF client_type_value = 'hunting' THEN
        INSERT INTO public.client_candidate_visibility (
            client_candidate_id,
            show_availability,
            show_salary_expectation,
            show_certifications,
            show_documents,
            show_personal_documents,
            show_address,
            show_professional_experience,
            show_contact_info
        ) VALUES (
            NEW.id,
            false,  -- Não mostra disponibilidade
            false,  -- Não mostra expectativa salarial
            false,  -- Certificações bloqueadas inicialmente
            false,  -- Documentos bloqueados inicialmente
            false,  -- Documentos pessoais bloqueados
            false,  -- Endereço bloqueado
            true,   -- Mostra experiência profissional
            true    -- Mostra contato
        );
    ELSE
        -- Para labor_supply, mostrar tudo por padrão
        INSERT INTO public.client_candidate_visibility (
            client_candidate_id,
            show_availability,
            show_salary_expectation,
            show_certifications,
            show_documents,
            show_personal_documents,
            show_address,
            show_professional_experience,
            show_contact_info
        ) VALUES (
            NEW.id,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Registro já existe, ignorar
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar visibilidade automaticamente ao atribuir candidato
CREATE TRIGGER create_visibility_on_client_candidate_insert
    AFTER INSERT ON public.client_candidates
    FOR EACH ROW
    EXECUTE FUNCTION public.create_visibility_on_assignment();