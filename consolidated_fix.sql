-- Consolidated Database Synchronization Script for Copy Trading
-- This script merges all previous fixes into a single, idempotent migration.

-- 1. EXTEND order_history TABLE
ALTER TABLE order_history 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id),
ADD COLUMN IF NOT EXISTS demat_account_id UUID REFERENCES demat_accounts(id),
ADD COLUMN IF NOT EXISTS symbol TEXT,
ADD COLUMN IF NOT EXISTS exchange TEXT,
ADD COLUMN IF NOT EXISTS buy_sell TEXT,
ADD COLUMN IF NOT EXISTS order_type TEXT,
ADD COLUMN IF NOT EXISTS variety TEXT DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT 'DAY',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app',
ADD COLUMN IF NOT EXISTS parent_broker_order_id TEXT;

-- 1.2 Add Indices and Constraints for order_history
CREATE INDEX IF NOT EXISTS idx_order_history_parent_id ON order_history(parent_broker_order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_group_id ON order_history(group_id);

ALTER TABLE order_history 
DROP CONSTRAINT IF EXISTS order_history_demat_account_id_fkey,
DROP CONSTRAINT IF EXISTS order_history_group_id_fkey;

ALTER TABLE order_history 
ADD CONSTRAINT order_history_demat_account_id_fkey 
FOREIGN KEY (demat_account_id) REFERENCES demat_accounts(id) ON DELETE CASCADE,
ADD CONSTRAINT order_history_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- 2. FIX demat_accounts TABLE
ALTER TABLE demat_accounts 
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_client_id') THEN
        ALTER TABLE demat_accounts ADD CONSTRAINT unique_client_id UNIQUE (client_id);
    END IF;
END $$;

ALTER TABLE demat_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own demat accounts" ON demat_accounts;
CREATE POLICY "Users can manage their own demat accounts"
ON demat_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. FIX groups AND group_accounts RLS
ALTER TABLE groups ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE group_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own groups" ON groups;
CREATE POLICY "Users can manage their own groups"
ON groups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own group mappings" ON group_accounts;
CREATE POLICY "Users can manage their own group mappings"
ON group_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. FIX watchlist TABLE
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    symbol TEXT,
    exchange TEXT,
    symbol_token TEXT,
    script_type TEXT DEFAULT 'Equity'
);

ALTER TABLE watchlist 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS symbol TEXT,
ADD COLUMN IF NOT EXISTS exchange TEXT,
ADD COLUMN IF NOT EXISTS symbol_token TEXT,
ADD COLUMN IF NOT EXISTS script_type TEXT DEFAULT 'Equity';

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own watchlist" ON watchlist;
CREATE POLICY "Users can insert own watchlist" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own watchlist" ON watchlist;
CREATE POLICY "Users can delete own watchlist" ON watchlist FOR DELETE USING (auth.uid() = user_id);
