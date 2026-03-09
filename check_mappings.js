
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMappings() {
    console.log('--- Current Mappings ---');
    const { data: mappings, error } = await supabase
        .from('group_accounts')
        .select('*, demat_accounts(nickname, client_id), groups(group_name)');

    if (error) {
        console.error(error);
        return;
    }

    if (!mappings || mappings.length === 0) {
        console.log('No mappings found.');
    } else {
        mappings.forEach(m => {
            console.log(`Group: ${m.groups?.group_name}, Account: ${m.demat_accounts?.nickname} (${m.demat_accounts?.client_id}), Type: ${m.account_type}, Multiplier: ${m.multiplier}`);
        });
    }
}

checkMappings();
