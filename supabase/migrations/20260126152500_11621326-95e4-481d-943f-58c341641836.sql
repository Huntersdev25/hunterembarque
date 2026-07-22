-- Create ranch_items table for provisions control
CREATE TABLE public.ranch_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vessel_id uuid NOT NULL REFERENCES public.measurement_vessels(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    unit_type text NOT NULL CHECK (unit_type IN ('Kg', 'Und', 'CX', 'Pact', 'L', 'g')),
    quantity numeric NOT NULL DEFAULT 0,
    unit_price numeric NOT NULL DEFAULT 0,
    total_value numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
    category text DEFAULT 'Geral',
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_ranch_items_vessel_id ON public.ranch_items(vessel_id);
CREATE INDEX idx_ranch_items_category ON public.ranch_items(category);

-- Enable RLS
ALTER TABLE public.ranch_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage ranch_items"
ON public.ranch_items FOR ALL
USING (is_admin(auth.uid()) OR is_current_user_ti());

CREATE POLICY "Clients can view their ranch_items"
ON public.ranch_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM measurement_vessels mv
        JOIN clients c ON c.id = mv.client_id
        WHERE mv.id = ranch_items.vessel_id
        AND c.user_id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_ranch_items_updated_at
BEFORE UPDATE ON public.ranch_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();