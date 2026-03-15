import { supabase } from '../utils/supabase';
import { loginAngelOne } from './brokers/angelone';
import { placeOrder, modifyOrder, cancelOrder } from './brokers/angelone_orders';

const mapProductType = (angelProduct: string) => {
    const mapping: { [key: string]: string } = {
        'CNC': 'DELIVERY',
        'MIS': 'INTRADAY',
        'NRML': 'CARRYFORWARD',
        'MARGIN': 'MARGIN',
        'CARRYFORWARD': 'CARRYFORWARD',
        'DELIVERY': 'DELIVERY',
        'INTRADAY': 'INTRADAY'
    };
    return mapping[angelProduct.toUpperCase()] || angelProduct;
};

const mapVariety = (variety: string) => {
    const v = variety.toUpperCase();
    if (v === 'AMO') return 'NORMAL';
    if (['NORMAL', 'STOPLOSS', 'ROBO'].includes(v)) return v;
    return 'NORMAL';
};

const sendOrderToBroker = async (account: any, orderDetails: any) => {
    console.log(`[GroupOrder] Executing ${orderDetails.transactionType} for ${orderDetails.tradingsymbol || orderDetails.symbol} on account ${account.nickname}`);

    try {
        if (account.broker_name.toLowerCase() === 'angelone') {
            const { sessionManager } = require('./brokers/SessionManager');
            const session = await sessionManager.getSession(account);

            if (!session.success) {
                return { success: false, error: 'Authentication failed' };
            }

            const multiplier = Number(account.multiplier) || 1;
            const finalQuantity = Math.floor(Number(orderDetails.quantity) * multiplier);

            const getVal = (obj: any, keys: string[]) => {
                for (const key of keys) {
                    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                    const lowerKey = key.toLowerCase();
                    if (obj[lowerKey] !== undefined && obj[lowerKey] !== null) return obj[lowerKey];
                    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
                    if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
                }
                return undefined;
            };

            // 2. Place order
            const orderParams: any = {
                variety: mapVariety(getVal(orderDetails, ['variety']) || 'NORMAL'),
                tradingsymbol: getVal(orderDetails, ['tradingsymbol', 'tradingSymbol']),
                symboltoken: getVal(orderDetails, ['symboltoken', 'symbolToken']),
                transactiontype: getVal(orderDetails, ['transactiontype', 'transactionType']),
                exchange: getVal(orderDetails, ['exchange']),
                ordertype: getVal(orderDetails, ['ordertype', 'orderType']),
                producttype: mapProductType(getVal(orderDetails, ['producttype', 'productType'])),
                duration: getVal(orderDetails, ['duration']) || 'DAY',
                price: getVal(orderDetails, ['price', 'averageprice'])?.toString() || '0',
                quantity: finalQuantity.toString(),
                squareoff: "0",
                stoploss: "0",
                scripconsent: "yes"
            };

            const triggerPrice = getVal(orderDetails, ['triggerprice', 'triggerPrice']);
            if (triggerPrice && triggerPrice !== '') {
                orderParams.triggerprice = triggerPrice.toString();
            }

            const disclosedQty = getVal(orderDetails, ['disclosedquantity', 'disclosedQuantity']);
            if (disclosedQty && disclosedQty !== '') {
                orderParams.disclosedquantity = disclosedQty.toString();
            }

            console.log(`[GroupOrder] Sending placement to Angel One for ${account.nickname}:`, JSON.stringify(orderParams));
            
            const response = await placeOrder(session.accessToken, account.api_key, orderParams);
            
            console.log(`[GroupOrder] Response for ${account.nickname}:`, JSON.stringify(response));

            return {
                success: response.status === true || response.message === 'SUCCESS',
                orderid: response.data?.orderid || response.orderid,
                message: response.message
            };
        }
    } catch (error: any) {
        console.error(`[GroupOrder] Error for ${account.nickname}:`, JSON.stringify(error.response?.data || error.message || error));
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

        // 2. Identify Master and Children
        const masterMapping = mappings.find(m => m.account_type === 'Master');
        const childMappings = mappings.filter(m => m.account_type === 'Child');

        if (!masterMapping) {
            console.log(`[GroupOrder] No Master found for group ${groupId}. Placing as individual accounts.`);
        }

        const results = [];
        let masterBrokerOrderId = null;

        // 3. Execute Master order first (if exists)
        if (masterMapping) {
            const masterAccount = accounts.find(a => a.id === masterMapping.demat_account_id);
            if (masterAccount) {
                const masterWithContext = { ...masterAccount, multiplier: masterMapping.multiplier || 1 };
                const result = await sendOrderToBroker(masterWithContext, orderDetails);
                results.push({ account: masterAccount, result, type: 'Master' });
                if (result.success && result.orderid) {
                    masterBrokerOrderId = result.orderid;
                }
            }
        }

        // 4. Execute Child orders (linking to Master if possible)
        for (const mapping of childMappings) {
            const account = accounts.find(a => a.id === mapping.demat_account_id);
            if (!account) continue;
            
            // Skip if this was also the master (unlikely but safe)
            if (results.some(r => r.account.id === account.id)) continue;

            const accountWithContext = { ...account, multiplier: mapping.multiplier || 1 };
            const result = await sendOrderToBroker(accountWithContext, orderDetails);
            results.push({ account, result, type: 'Child' });
        }

        // 5. Log results to order_history
        const historyLogs = results.map(({ account, result, type }) => {
            const mapping = mappings.find(m => m.demat_account_id === account.id);
            const multiplier = Number(mapping?.multiplier) || 1;

            return {
                user_id: account.user_id,
                group_id: groupId,
                demat_account_id: account.id,
                symbol: orderDetails.tradingsymbol || orderDetails.symbol,
                exchange: orderDetails.exchange,
                buy_sell: orderDetails.transactiontype || orderDetails.transactionType,
                order_type: orderDetails.ordertype || orderDetails.orderType,
                price: orderDetails.price || 0,
                quantity: Math.floor(Number(orderDetails.quantity) * multiplier),
                status: result.success ? 'Success' : 'Failed',
                broker_order_id: result.orderid || null,
                parent_broker_order_id: type === 'Child' ? masterBrokerOrderId : null,
                source: 'app'
            };
        });

        await supabase.from('order_history').insert(historyLogs);

        return {
            total_accounts: results.length,
            success_count: results.filter(r => r.result.success).length,
            orderIds: results.map(r => r.result.orderid || 'FAILED')
        };
    } catch (error: any) {
        console.error('Group Order execution failed:', error);
        throw error;
    }
};

export const replicateMasterOrder = async (masterAccountId: string, orderDetails: any) => {
    try {
        console.log(`[CopyTrade] Detected master order for account: ${masterAccountId}`);

        // 1. Find all groups where this account is a 'Master'
        const { data: masterGroups, error: groupError } = await supabase
            .from('group_accounts')
            .select('group_id')
            .eq('demat_account_id', masterAccountId)
            .eq('account_type', 'Master');

        if (groupError) throw groupError;
        if (!masterGroups || masterGroups.length === 0) {
            console.log(`[CopyTrade] Account ${masterAccountId} is not a Master in any group.`);
            return;
        }

        const groupIds = masterGroups.map(g => g.group_id);

        for (const groupId of groupIds) {
            console.log(`[CopyTrade] Replicating order for group: ${groupId}`);

            // 2. Find all 'Child' accounts in this group
            const { data: groupMembers, error: memberError } = await supabase
                .from('group_accounts')
                .select('demat_account_id, multiplier')
                .eq('group_id', groupId)
                .eq('account_type', 'Child');

            if (memberError) throw memberError;
            if (!groupMembers || groupMembers.length === 0) {
                console.log(`[CopyTrade] No child accounts found in group ${groupId}`);
                continue;
            }

            const childAccountIds = groupMembers.map(m => m.demat_account_id);
            const { data: accounts, error: accError } = await supabase
                .from('demat_accounts')
                .select('*')
                .in('id', childAccountIds);

            if (accError) throw accError;

            // 3. Execute orders for each child account
            const results = [];
            for (const account of accounts) {
                const mapping = groupMembers.find(m => m.demat_account_id === account.id);
                const accountWithContext = { ...account, multiplier: mapping?.multiplier || 1 };

                // Adapt Master order details for sendOrderToBroker
                const childOrderDetails = {
                    tradingsymbol: orderDetails.tradingsymbol,
                    symboltoken: orderDetails.symboltoken,
                    transactionType: orderDetails.transactiontype,
                    exchange: orderDetails.exchange,
                    orderType: orderDetails.ordertype,
                    productType: orderDetails.producttype,
                    variety: orderDetails.variety || 'NORMAL',
                    duration: orderDetails.duration || 'DAY',
                    quantity: orderDetails.quantity,
                    price: orderDetails.price || orderDetails.averageprice || '0',
                    triggerprice: orderDetails.triggerprice || '',
                    disclosedquantity: orderDetails.disclosedquantity || ''
                };

                const result = await sendOrderToBroker(accountWithContext, childOrderDetails);
                results.push({ account, result });
            }

            // 4. Log results
            const historyLogs = results.map(({ account, result }) => {
                const mapping = groupMembers.find(m => m.demat_account_id === account.id);
                const multiplier = Number(mapping?.multiplier) || 1;

                return {
                    user_id: account.user_id,
                    group_id: groupId,
                    demat_account_id: account.id,
                    symbol: orderDetails.tradingsymbol,
                    exchange: orderDetails.exchange,
                    buy_sell: orderDetails.transactiontype,
                    order_type: orderDetails.ordertype,
                    price: orderDetails.price || 0,
                    quantity: Math.floor(Number(orderDetails.quantity) * multiplier),
                    status: result.success ? 'Success' : 'Failed',
                    broker_order_id: result.orderid || null,
                    parent_broker_order_id: orderDetails.orderid, // Link to master
                    source: 'copy_trade'
                };
            });

            await supabase.from('order_history').insert(historyLogs);
        }
    } catch (error: any) {
        console.error('[CopyTrade] Replication failed:', error.message);
    }
};

export const modifyReplicatedOrders = async (masterOrderId: string, newDetails: any) => {
    try {
        console.log(`[CopyTrade] Modifying child orders for master order: ${masterOrderId}`);

        // 1. Find all child orders in history linked to this master
        const { data: childOrders, error: fetchError } = await supabase
            .from('order_history')
            .select('*, demat_accounts(*)')
            .eq('parent_broker_order_id', masterOrderId);

        if (fetchError || !childOrders || childOrders.length === 0) {
            console.log(`[CopyTrade] No child orders found to modify for master order ${masterOrderId}`);
            return;
        }

        for (const childOrder of childOrders) {
            const account = childOrder.demat_accounts;
            if (!account) continue;

            console.log(`[CopyTrade] Modifying order for child: ${account.nickname}`);

            // 2. Login
            const { sessionManager } = require('./brokers/SessionManager');
            const session = await sessionManager.getSession(account);
            if (!session.success) continue;

            // 3. Calculate new quantity if needed (fetching multiplier from group_accounts)
            const { data: mapping } = await supabase
                .from('group_accounts')
                .select('multiplier')
                .eq('group_id', childOrder.group_id)
                .eq('demat_account_id', account.id)
                .single();

            const multiplier = Number(mapping?.multiplier) || 1;
            const finalQuantity = Math.floor(Number(newDetails.quantity) * multiplier);

            // 4. Modify order
            const modifyParams = {
                variety: newDetails.variety || childOrder.variety || 'NORMAL',
                orderid: childOrder.broker_order_id,
                ordertype: newDetails.ordertype,
                producttype: newDetails.producttype,
                duration: newDetails.duration || 'DAY',
                price: newDetails.price?.toString() || '0',
                quantity: finalQuantity.toString(),
                tradingsymbol: newDetails.tradingsymbol,
                symboltoken: newDetails.symboltoken,
                exchange: newDetails.exchange
            };

            const result = await modifyOrder(session.accessToken, account.api_key, modifyParams);
            
            if (result.status) {
                // Update history
                await supabase.from('order_history')
                    .update({
                        price: parseFloat(newDetails.price) || 0,
                        quantity: finalQuantity,
                        status: 'Modified'
                    })
                    .eq('id', childOrder.id);
            }
        }
    } catch (error: any) {
        console.error('[CopyTrade] Modification failed:', error.message);
    }
};

export const cancelReplicatedOrders = async (masterOrderId: string) => {
    try {
        console.log(`[CopyTrade] Cancelling child orders for master order: ${masterOrderId}`);

        // 1. Find all child orders
        const { data: childOrders, error: fetchError } = await supabase
            .from('order_history')
            .select('*, demat_accounts(*)')
            .eq('parent_broker_order_id', masterOrderId)
            .not('status', 'ilike', 'cancelled');

        if (fetchError || !childOrders || childOrders.length === 0) {
            console.log(`[CopyTrade] No active child orders found to cancel for master order ${masterOrderId}`);
            return;
        }

        for (const childOrder of childOrders) {
            const account = childOrder.demat_accounts;
            if (!account) continue;

            // 2. Login
            const { sessionManager } = require('./brokers/SessionManager');
            const session = await sessionManager.getSession(account);
            if (!session.success) continue;

            // 3. Cancel
            const result = await cancelOrder(session.accessToken, account.api_key, childOrder.broker_order_id);
            
            if (result.status) {
                await supabase.from('order_history')
                    .update({ status: 'Cancelled' })
                    .eq('id', childOrder.id);
            }
        }
    } catch (error: any) {
        console.error('[CopyTrade] Cancellation failed:', error.message);
    }
};
