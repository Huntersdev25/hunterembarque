-- Add foreign key constraint between professional_requests and clients
ALTER TABLE professional_requests
ADD CONSTRAINT professional_requests_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;