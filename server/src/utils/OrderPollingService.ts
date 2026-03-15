import { supabase } from './supabase';
import { sessionManager } from './brokers/SessionManager';
import { getOrderBook } from './brokers/angelone_orders';
import { replicateMasterOrder } from './orders';

class OrderPollingService {
    private isRunning: boolean = false;
    private interval: NodeJS.Timeout | null = null;
    private processedOrders: Set<string> = new Set();
    private pollIntervalMs: number = 60000; // 60 seconds (1 minute)

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[OrderPollingService] Starting background polling...');

        // Initial load of processed orders from today to avoid duplicates on restart
        await this.loadInitialOrderHistory();

        this.interval = setInterval(() => this.poll(), this.pollIntervalMs);
    }

    private async loadInitialOrderHistory() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from('order_history')
                .select('broker_order_id')
                .gte('executed_at', today.toISOString());

            if (data) {
                data.forEach(order => {
                    if (order.broker_order_id) this.processedOrders.add(order.broker_order_id);
                });
                console.log(`[OrderPollingService] Loaded ${this.processedOrders.size} existing orders into cache.`);
            }
        } catch (error) {
            console.error('[OrderPollingService] Failed to load initial history:', error);
        }
    }

    private async poll() {
        try {
            // 1. Find all Master accounts
            const { data: masterMappings, error: mappingError } = await supabase
                .from('group_accounts')
                .select('demat_account_id')
                .eq('account_type', 'Master');

            if (mappingError || !masterMappings) return;

            const uniqueMasterIds = [...new Set(masterMappings.map(m => m.demat_account_id))];

            for (const accountId of uniqueMasterIds) {
                const { data: account, error: accError } = await supabase
                    .from('demat_accounts')
                    .select('*')
                    .eq('id', accountId)
                    .single();

                if (accError || !account) continue;

                // 2. Get session
                const session = await sessionManager.getSession(account);
                if (!session.success || !session.accessToken) {
                    console.warn(`[OrderPollingService] Could not get session for ${account.client_id}`);
                    continue;
                }

                // 3. Fetch Order Book
                const orderBook = await getOrderBook(session.accessToken, account.api_key);
                if (!orderBook.status || !orderBook.data) {
                    if (orderBook.message === 'Invalid Token') sessionManager.invalidateSession(accountId);
                    continue;
                }

                // 4. Process Orders
                for (const order of orderBook.data) {
                    // Only process 'COMPLETE' or 'OPEN' orders to capture them as they happen
                    // status: 'complete', 'open', 'validation pending', etc.
                    if (this.processedOrders.has(order.orderid)) continue;

                    // If it's a new order (likely from mobile app since our app logs it immediately)
                    console.log(`[OrderPollingService] New external order detected: ${order.orderid} for ${account.client_id}`);

                    // Mark as processed before replicating to avoid race conditions
                    this.processedOrders.add(order.orderid);

                    // Cross-check DB one last time to be absolutely sure
                    const { data: existing } = await supabase
                        .from('order_history')
                        .select('id')
                        .eq('broker_order_id', order.orderid)
                        .single();

                    if (!existing) {
                        try {
                            // Replicate (orderDetails must match Angel One's postback/orderbook format)
                            await replicateMasterOrder(accountId, {
                                ...order,
                                tradingsymbol: order.tradingsymbol,
                                symboltoken: order.symboltoken,
                                transactiontype: order.transactiontype,
                                exchange: order.exchange,
                                ordertype: order.ordertype,
                                producttype: order.producttype,
                                quantity: order.quantity,
                                price: order.price,
                                status: order.status
                            });
                        } catch (err: any) {
                            console.error(`[OrderPollingService] Replication failed for ${order.orderid}:`, err.message);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error('[OrderPollingService] Polling loop error:', error.message);
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
    }
}

export const orderPollingService = new OrderPollingService();
