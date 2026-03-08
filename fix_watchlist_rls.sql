-- Ensure user_id column exists
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to select their own watchlist items
DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
CREATE POLICY "Users can view own watchlist" ON watchlist
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own watchlist items
DROP POLICY IF EXISTS "Users can insert own watchlist" ON watchlist;
CREATE POLICY "Users can insert own watchlist" ON watchlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own watchlist items
DROP POLICY IF EXISTS "Users can delete own watchlist" ON watchlist;
CREATE POLICY "Users can delete own watchlist" ON watchlist
    FOR DELETE USING (auth.uid() = user_id);
