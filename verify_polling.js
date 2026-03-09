
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPollingSetup() {
    console.log('--- Verifying Polling Setup ---');

    // 1. Check if any Master accounts exist
    const { data: masters, error: masterError } = await supabase
        .from('group_accounts')
        .select('demat_account_id, groups(group_name)')
        .eq('account_type', 'Master');

    if (masterError) {
        console.error('Error fetching masters:', masterError);
        return;
    }

    if (!masters || masters.length === 0) {
        console.log('No Master accounts found. Please set a Master account in a group via the UI.');
        return;
    }

    console.log(`Found ${masters.length} Master account(s) in groups: ${masters.map(m => m.groups.group_name).join(', ')}`);

    // 2. Explain how to test
    console.log('\nTo verify the feature:');
    console.log('1. Ensure the server is running (npm run dev in the server directory).');
    console.log('2. Place a small market order on one of these Master accounts via your Angel One mobile app.');
    console.log('3. Watch the server console for "[OrderPollingService] New external order detected" and "[CopyTrade] Replicating order".');
    console.log('4. Check the order history of your Child accounts.');
}

verifyPollingSetup();
