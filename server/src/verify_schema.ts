
import { supabase } from './utils/supabase';

async function verifySchema() {
    console.log('--- Database Schema Verification Report ---');

    const tables = [
        {
            name: 'order_history',
            requiredColumns: ['user_id', 'group_id', 'demat_account_id', 'symbol', 'exchange', 'buy_sell', 'order_type', 'variety', 'duration', 'source', 'parent_broker_order_id']
        },
        {
            name: 'watchlist',
            requiredColumns: ['user_id', 'symbol', 'exchange', 'symbol_token', 'script_type']
        },
        {
            name: 'demat_accounts',
            requiredColumns: ['client_id', 'api_key', 'totp_secret', 'password', 'duration']
        },
        {
            name: 'groups',
            requiredColumns: ['user_id', 'group_name']
        },
        {
            name: 'group_accounts',
            requiredColumns: ['user_id', 'group_id', 'demat_account_id', 'account_type', 'multiplier']
        }
    ];

    for (const table of tables) {
        console.log(`Checking [${table.name}]...`);
        try {
            // Fetch one row to check columns
            const { data, error } = await supabase.from(table.name).select('*').limit(1);
            
            if (error) {
                console.error(`  - ERROR: Table [${table.name}] might not exist or RLS issue: ${error.message}`);
                continue;
            }

            // Since select(*) only returns columns that exist in the row object, 
            // but PostgREST returns all column keys even if they are null for a row.
            // If the table is empty, we might need a different approach, 
            // but usually we can check a mock insertion or specialized RPC.
            // For now, let's assume if data exists, we check keys.
            
            if (data && data.length > 0) {
                const columns = Object.keys(data[0]);
                const missing = table.requiredColumns.filter(c => !columns.includes(c));
                
                if (missing.length === 0) {
                    console.log(`  - SUCCESS: All ${table.requiredColumns.length} columns verified.`);
                } else {
                    console.error(`  - FAILED: Missing columns: ${missing.join(', ')}`);
                }
            } else {
                console.log(`  - WARNING: Table is empty. Trying a dry-run insert to verify columns...`);
                // Try to select specifically the required columns to see if it fails
                const { error: colError } = await supabase.from(table.name).select(table.requiredColumns.join(',')).limit(0);
                if (colError) {
                    console.error(`  - FAILED: Column validation failed: ${colError.message}`);
                } else {
                    console.log(`  - SUCCESS: Column existence verified via empty select.`);
                }
            }
        } catch (err: any) {
            console.error(`  - CRITICAL ERROR: ${err.message}`);
        }
    }
}

verifySchema();
