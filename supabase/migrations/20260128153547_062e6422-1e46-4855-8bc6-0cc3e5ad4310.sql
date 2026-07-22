-- Add client_type column to clients table
ALTER TABLE public.clients 
ADD COLUMN client_type text NOT NULL DEFAULT 'labor_supply' 
CHECK (client_type IN ('hunting', 'labor_supply'));

-- Add comment for documentation
COMMENT ON COLUMN public.clients.client_type IS 'Type of client: hunting or labor_supply (fornecimento de mão de obra)';