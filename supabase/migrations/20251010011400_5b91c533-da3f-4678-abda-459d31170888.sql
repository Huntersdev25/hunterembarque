-- Adicionar foreign key para candidate_id referenciando profiles
ALTER TABLE public.client_candidates
ADD CONSTRAINT client_candidates_candidate_id_fkey
FOREIGN KEY (candidate_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;