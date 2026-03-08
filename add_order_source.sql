-- Add source column to order_history table to distinguish between app-made orders and external broker trades
ALTER TABLE order_history 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app';

-- Update existing records to default to 'app' if they don't have a source
UPDATE order_history SET source = 'app' WHERE source IS NULL;
