
import { supabase } from './utils/supabase';

async function checkSchema() {
    console.log('--- demat_accounts ---');
    const { data: demat, error: dematError } = await supabase.from('demat_accounts').select('*').limit(1);
    if (dematError) console.error('demat_accounts Error:', dematError.message);
    else if (demat && demat.length > 0) console.log('Columns:', Object.keys(demat[0]));
    else console.log('Empty table or accessed with restricted permissions');

    console.log('\n--- group_accounts ---');
    const { data: group, error: groupError } = await supabase.from('group_accounts').select('*').limit(1);
    if (groupError) console.error('group_accounts Error:', groupError.message);
    else if (group && group.length > 0) console.log('Columns:', Object.keys(group[0]));
    else console.log('Empty table or accessed with restricted permissions');

    console.log('\n--- groups ---');
    const { data: groups, error: groupsError } = await supabase.from('groups').select('*').limit(1);
    if (groupsError) console.error('groups Error:', groupsError.message);
    else if (groups && groups.length > 0) console.log('Columns:', Object.keys(groups[0]));
    else console.log('Empty table or accessed with restricted permissions');

    console.log('\n--- watchlist ---');
    const { data: watchlist, error: watchlistError } = await supabase.from('watchlist').select('*').limit(1);
    if (watchlistError) {
        console.error('watchlist Error (Likely missing or RLS):', watchlistError.message);
    } else if (watchlist && watchlist.length > 0) {
        console.log('Columns:', Object.keys(watchlist[0]));
    } else {
        console.log('Empty table or accessed with restricted permissions');
    }

    console.log('\n--- check for specific columns ---');
    const { data: history, error: historyError } = await supabase.from('order_history').select('*').limit(1);
    if (historyError) console.error('order_history Error:', historyError.message);
    else if (history && history.length > 0) {
        console.log('order_history Columns:', Object.keys(history[0]));
    }
}

checkSchema();
