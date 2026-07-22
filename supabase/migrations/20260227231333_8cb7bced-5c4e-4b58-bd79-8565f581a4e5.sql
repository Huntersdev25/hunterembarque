
-- Trigger function to sanitize date fields on tasks (converts pt-BR dd/MM/yyyy to yyyy-MM-dd)
CREATE OR REPLACE FUNCTION public.sanitize_task_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  raw_due text;
  raw_start text;
  parts text[];
BEGIN
  -- Sanitize due_date: if it looks like dd/MM/yyyy or dd/MM/yy, convert
  raw_due := NEW.due_date::text;
  IF raw_due IS NOT NULL AND raw_due ~ '^\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}$' THEN
    parts := regexp_matches(raw_due, '^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})$');
    IF array_length(parts, 1) = 3 THEN
      IF length(parts[3]) = 2 THEN parts[3] := '20' || parts[3]; END IF;
      NEW.due_date := (parts[3] || '-' || lpad(parts[2], 2, '0') || '-' || lpad(parts[1], 2, '0'))::date;
    END IF;
  END IF;

  -- Sanitize start_date
  raw_start := NEW.start_date::text;
  IF raw_start IS NOT NULL AND raw_start ~ '^\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}$' THEN
    parts := regexp_matches(raw_start, '^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})$');
    IF array_length(parts, 1) = 3 THEN
      IF length(parts[3]) = 2 THEN parts[3] := '20' || parts[3]; END IF;
      NEW.start_date := (parts[3] || '-' || lpad(parts[2], 2, '0') || '-' || lpad(parts[1], 2, '0'))::date;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER sanitize_task_dates_trigger
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_task_dates();
