-- Make the old 'status' column nullable since we now use status_id
ALTER TABLE public.tasks ALTER COLUMN status DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'pending';