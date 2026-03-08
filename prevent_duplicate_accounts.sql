-- Prevent duplicate Angel accounts from being added
-- This ensures that a client_id can only appear once in the entire platform
ALTER TABLE demat_accounts 
ADD CONSTRAINT unique_client_id UNIQUE (client_id);
