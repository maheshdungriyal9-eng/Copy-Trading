import { supabase } from '../utils/supabase';
import { loginAngelOne } from './brokers/angelone';
import { placeOrder } from './brokers/angelone_orders';

const sendOrderToBroker = async (account: any, orderDetails: any) => {
    console.log(`[GroupOrder] Executing ${orderDetails.transactionType} for ${orderDetails.symbol} on account ${account.nickname}`);

    try {
        if (account.broker_name.toLowerCase() === 'angelone') {
            // 1. Login to get fresh session
            const session = await loginAngelOne(
                account.client_id,
                account.totp_secret,
                account.api_key,
                account.password
            );

            if (!session.success) {
                return { success: false, error: 'Authentication failed' };
            }

            const multiplier = Number(account.multiplier) || 1;
            const finalQuantity = Math.floor(Number(orderDetails.quantity) * multiplier);

            // 2. Place order
            const orderParams: any = {
                variety: 'NORMAL',
                tradingsymbol: orderDetails.tradingsymbol,
                symboltoken: orderDetails.symboltoken,
                transactiontype: orderDetails.transactionType,
                exchange: orderDetails.exchange,
                ordertype: orderDetails.orderType,
                producttype: orderDetails.productType,
                duration: 'DAY',
                price: orderDetails.price?.toString() || '0',
                quantity: finalQuantity.toString()
            };

            const response = await placeOrder(session.access_token, account.api_key, orderParams);
            return {
                success: response.status === true || response.message === 'SUCCESS',
                orderid: response.data?.orderid || response.orderid,
                message: response.message
            };
        }
    } catch (error: any) {
        console.error(`[GroupOrder] Error for ${account.nickname}:`, error.message || error);
        return { success: false, error: error.message || 'Placement failed' };
    }

    return { success: false, error: 'Unsupported broker' };
};

export const executeGroupOrder = async (groupId: string, orderDetails: any, userId: string) => {
    try {
        // 1. Fetch group mappings and check for Master account
        const { data: mappings, error } = await supabase
            .from('group_accounts')
            .select('*')
            .eq('group_id', groupId);

        if (error) throw error;
        if (!mappings || mappings.length === 0) throw new Error('No accounts found in this group');

        const accountIds = mappings.map(m => m.demat_account_id);
        const { data: accounts, error: accError } = await supabase
            .from('demat_accounts')
            .select('*')
            .in('id', accountIds);

        if (accError) throw accError;

        // 2. Execute orders in sequence (to avoid rate limits or session conflicts easily, 
        // though parallel is better for performance, sequence is safer for now)
        const results = [];
        for (const account of accounts) {
            const mapping = mappings.find(m => m.demat_account_id === account.id);
            const accountWithContext = { ...account, multiplier: mapping?.multiplier || 1 };
            const result = await sendOrderToBroker(accountWithContext, orderDetails);
            results.push({ account, result });
        }

        // 3. Log results to order_history
        const historyLogs = results.map(({ account, result }) => {
            const mapping = mappings.find(m => m.demat_account_id === account.id);
            const multiplier = Number(mapping?.multiplier) || 1;

            return {
                user_id: account.user_id,
                group_id: groupId,
                demat_account_id: account.id,
                symbol: orderDetails.symbol,
                exchange: orderDetails.exchange,
                buy_sell: orderDetails.transactionType,
                order_type: orderDetails.orderType,
                price: orderDetails.price || 0,
                quantity: Math.floor(Number(orderDetails.quantity) * multiplier),
                status: result.success ? 'Success' : 'Failed',
                broker_order_id: result.orderid || null,
                source: 'app'
            };
        });

        await supabase.from('order_history').insert(historyLogs);

        return {
            total_accounts: accounts.length,
            success_count: results.filter(r => r.result.success).length,
            orderIds: results.map(r => r.result.orderid || 'FAILED')
        };
    } catch (error: any) {
        console.error('Group Order execution failed:', error);
        throw error;
    }
};
