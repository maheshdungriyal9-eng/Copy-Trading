-- Add parent_broker_order_id to order_history to track which master order triggered a child order
ALTER TABLE order_history 
ADD COLUMN IF NOT EXISTS parent_broker_order_id TEXT;

-- Create an index to speed up lookups for child orders belonging to a master order
CREATE INDEX IF NOT EXISTS idx_order_history_parent_id ON order_history(parent_broker_order_id);
