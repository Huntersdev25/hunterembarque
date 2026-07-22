-- Add CV upload field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cv_file_path text,
ADD COLUMN cv_file_name text;