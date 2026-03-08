import { supabase } from '../utils/supabase';
import { placeAngelOneOrder } from './brokers/angelone';

// Real function to send orders to broker APIs
const sendOrderToBroker = async (account: any, orderDetails: any) => {
    console.log(`Executing ${orderDetails.transactionType} for ${orderDetails.symbol} on account ${account.nickname}`);

    if (account.broker_name === 'Angel One') {
        const quantity = Math.floor(orderDetails.quantity * (account.multiplier || 1));

        // Symbol parsing for Angel One (requires token, exchange, etc.)
        // For simplicity, we assume token is provided or we fetch it from a mapping
        // In a production app, we'd have a symbol-to-token mapping database

        return await placeAngelOneOrder(
            account.access_token,
            account.api_key,
            {
                symbol: orderDetails.symbol,
                exchange: orderDetails.exchange || 'NSE',
                tradingsymbol: orderDetails.symbol.split(':')[1] || orderDetails.symbol,
                symboltoken: account.symbolToken || '14366', // Mock token for INFY
                transactiontype: orderDetails.transactionType,
                quantity: quantity,
                ordertype: orderDetails.orderType,
                producttype: orderDetails.productType,
                price: orderDetails.price
            }
        );
    }

    return { success: false, error: 'Unsupported broker' };
};

export const executeGroupOrder = async (groupId: string, orderDetails: any) => {
    try {
        // 1. Fetch all accounts in the group with full credentials
        const { data: mappings, error } = await supabase
            .from('group_accounts')
            .select(`
                multiplier,
                demat_account_id
            `)
            .eq('group_id', groupId);

        if (error) throw error;
        if (!mappings || mappings.length === 0) throw new Error('No accounts found in this group');

        const accountIds = mappings.map(m => m.demat_account_id);
        const { data: accounts, error: accError } = await supabase
            .from('demat_accounts')
            .select('*')
            .in('id', accountIds);

        if (accError) throw accError;

        // 2. Execute orders in parallel
        const executionPromises = accounts.map((acc: any) => {
            const mapping = mappings.find(m => m.demat_account_id === acc.id);
            const accountWithMultiplier = { ...acc, multiplier: mapping?.multiplier || 1 };
            return sendOrderToBroker(accountWithMultiplier, orderDetails);
        });

        const results = await Promise.all(executionPromises);

        // 3. Log results to order_history
        const historyLogs = results.map((res: any, index: number) => ({
            user_id: accounts[index].user_id,
            group_id: groupId,
            demat_account_id: accounts[index].id,
            symbol: orderDetails.symbol,
            exchange: orderDetails.exchange,
            buy_sell: orderDetails.transactionType,
            order_type: orderDetails.orderType,
            price: orderDetails.price,
            quantity: Math.floor(orderDetails.quantity * (mappings[index]?.multiplier || 1)),
            status: res.success ? 'Success' : 'Failed',
            broker_order_id: res.success ? (res as { orderid: string }).orderid : null
        }));

        await supabase.from('order_history').insert(historyLogs);

        return {
            total_accounts: accounts.length,
            orderIds: results.map(r => 'orderid' in r ? r.orderid : 'FAILED')
        };
    } catch (error: any) {
        console.error('Order execution failed:', error);
        throw error;
    }
};
