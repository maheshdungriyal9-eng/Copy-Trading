
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- demat_accounts ---');
    const { data: demat, error: dematError } = await supabase.from('demat_accounts').select('*').limit(1);
    if (dematError) console.error(dematError);
    else if (demat && demat.length > 0) console.log(Object.keys(demat[0]));
    else console.log('Empty table');

    console.log('\n--- group_accounts ---');
    const { data: group, error: groupError } = await supabase.from('group_accounts').select('*').limit(1);
    if (groupError) console.error(groupError);
    else if (group && group.length > 0) console.log(Object.keys(group[0]));
    else console.log('Empty table');

    console.log('\n--- groups ---');
    const { data: groups, error: groupsError } = await supabase.from('groups').select('*').limit(1);
    if (groupsError) console.error(groupsError);
    else if (groups && groups.length > 0) console.log(Object.keys(groups[0]));
    else console.log('Empty table');
}

checkSchema();
