import { supabase } from './supabase';
import { sessionManager } from './brokers/SessionManager';
import { getOrderBook } from './brokers/angelone_orders';
import { replicateMasterOrder } from './orders';

class OrderPollingService {
    private isRunning: boolean = false;
    private timeout: NodeJS.Timeout | null = null;
    private processedOrders: Set<string> = new Set();
    private pollIntervalMs: number = 60000; // 60 seconds (1 minute)

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[OrderPollingService] Starting background polling...');

        // Initial load of processed orders from today to avoid duplicates on restart
        await this.loadInitialOrderHistory();

        this.scheduleNextPoll();
    }

    private scheduleNextPoll() {
        if (!this.isRunning) return;
        this.timeout = setTimeout(async () => {
            await this.poll();
            this.scheduleNextPoll();
        }, this.pollIntervalMs);
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

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
                try {
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
                        // Add a small delay even on failure to stay within rate limits for next call
                        await this.sleep(1000);
                        continue;
                    }

                    // 4. Process Orders
                    for (const order of orderBook.data) {
                        if (this.processedOrders.has(order.orderid)) continue;

                        console.log(`[OrderPollingService] New external order detected: ${order.orderid} for ${account.client_id}`);
                        this.processedOrders.add(order.orderid);

                        const { data: existing } = await supabase
                            .from('order_history')
                            .select('id')
                            .eq('broker_order_id', order.orderid)
                            .single();

                        if (!existing) {
                            try {
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

                    // Delay between accounts to avoid hitting rate limits (1 req/sec limit)
                    await this.sleep(2000);
                } catch (innerError: any) {
                    console.error(`[OrderPollingService] Error polling account ${accountId}:`, innerError.message);
                }
            }
        } catch (error: any) {
            console.error('[OrderPollingService] Polling loop error:', error.message);
        }
    }

    stop() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.isRunning = false;
    }
}

export const orderPollingService = new OrderPollingService();
