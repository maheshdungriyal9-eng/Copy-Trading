-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    symbol TEXT,
    exchange TEXT,
    symbol_token TEXT,
    script_type TEXT DEFAULT 'Equity'
);

-- 2. Ensure all columns exist (in case table existed but was missing columns)
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS symbol TEXT;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS exchange TEXT;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS symbol_token TEXT;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS script_type TEXT DEFAULT 'Equity';

-- 3. Enable RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own watchlist" ON watchlist;
CREATE POLICY "Users can insert own watchlist" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own watchlist" ON watchlist;
CREATE POLICY "Users can delete own watchlist" ON watchlist FOR DELETE USING (auth.uid() = user_id);
