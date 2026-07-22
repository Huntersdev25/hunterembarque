-- Add new columns to professional_requests table
ALTER TABLE professional_requests
ADD COLUMN period_start date,
ADD COLUMN period_end date,
ADD COLUMN unit text;

-- Add comment for clarity
COMMENT ON COLUMN professional_requests.period_start IS 'Data de início do período desejado';
COMMENT ON COLUMN professional_requests.period_end IS 'Data de fim do período desejado';
COMMENT ON COLUMN professional_requests.unit IS 'Unidade/Localização desejada';