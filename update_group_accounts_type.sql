-- 1. Add account_type to group_accounts
ALTER TABLE group_accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'Child';

-- 2. Optional: Add a check constraint to ensure only valid types are used
-- ALTER TABLE group_accounts ADD CONSTRAINT valid_account_type CHECK (account_type IN ('Master', 'Child'));
