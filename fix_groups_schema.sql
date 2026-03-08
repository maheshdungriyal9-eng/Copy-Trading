-- 1. Ensure 'user_id' column exists in 'groups' table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Ensure 'user_id' column exists in 'group_accounts' table (for easier RLS)
ALTER TABLE group_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 3. Enable RLS on both tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_accounts ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy for 'groups' (Allow all actions for the owner)
DROP POLICY IF EXISTS "Users can manage their own groups" ON groups;
CREATE POLICY "Users can manage their own groups"
ON groups
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Create Policy for 'group_accounts' (Allow all actions for the owner)
DROP POLICY IF EXISTS "Users can manage their own group mappings" ON group_accounts;
CREATE POLICY "Users can manage their own group mappings"
ON group_accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
