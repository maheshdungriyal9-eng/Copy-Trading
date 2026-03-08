-- Add cascading deletes for demat_accounts references

-- 1. Fix order_history foreign key
ALTER TABLE order_history 
DROP CONSTRAINT IF EXISTS order_history_demat_account_id_fkey;

ALTER TABLE order_history
ADD CONSTRAINT order_history_demat_account_id_fkey 
FOREIGN KEY (demat_account_id) 
REFERENCES demat_accounts(id) 
ON DELETE CASCADE;

-- 2. Fix group_accounts foreign key
ALTER TABLE group_accounts
DROP CONSTRAINT IF EXISTS group_accounts_demat_account_id_fkey;

ALTER TABLE group_accounts
ADD CONSTRAINT group_accounts_demat_account_id_fkey 
FOREIGN KEY (demat_account_id) 
REFERENCES demat_accounts(id) 
ON DELETE CASCADE;

-- 3. Verify RLS is still correct (should be from fix_demat_schema.sql)
-- Just in case, ensuring it's enabled
ALTER TABLE demat_accounts ENABLE ROW LEVEL SECURITY;
