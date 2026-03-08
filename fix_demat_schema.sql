-- Add missing columns to demat_accounts table
ALTER TABLE demat_accounts 
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE demat_accounts ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own demat accounts
-- (auth.uid() = user_id ensures users only add accounts for themselves)
CREATE POLICY "Users can manage their own demat accounts"
ON demat_accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Add symbol_token to watchlist
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS symbol_token TEXT;
