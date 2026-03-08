-- Fix group deletion constraint on order_history table
-- This allows deleting a group even if it has associated order history

ALTER TABLE order_history 
DROP CONSTRAINT IF EXISTS order_history_group_id_fkey;

ALTER TABLE order_history
ADD CONSTRAINT order_history_group_id_fkey 
FOREIGN KEY (group_id) 
REFERENCES groups(id) 
ON DELETE CASCADE;
