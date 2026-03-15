import WebSocket from 'ws';
import { supabase } from '../supabase';
import { sessionManager } from './SessionManager';
import { replicateMasterOrder } from '../orders';

export class AngelOneOrderSocket {
    private ws: WebSocket | null = null;
    private account: any;
    private pingInterval: NodeJS.Timeout | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor(account: any) {
        this.account = account;
    }

    async connect() {
        if (this.isConnected) return;

        try {
            const session = await sessionManager.getSession(this.account);
            if (!session.success || !session.accessToken) {
                console.error(`[OrderSocket] Failed to get session for ${this.account.client_id}`);
                return;
            }

            const url = 'wss://tns.angelone.in/smart-order-update';
            this.ws = new WebSocket(url, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'x-api-key': this.account.api_key,
                    'x-client-code': this.account.client_id,
                    'x-feed-token': session.feedToken
                }
            });

            this.ws.on('open', () => {
                console.log(`[OrderSocket] Connected for client: ${this.account.client_id}`);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.startPing();
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleOrderUpdate(message);
                } catch (err) {
                    // Ignore non-JSON messages (like pong)
                    if (data.toString() === 'pong') return;
                    console.error(`[OrderSocket] Error parsing message for ${this.account.client_id}:`, err);
                }
            });

            this.ws.on('error', (error) => {
                console.error(`[OrderSocket] WebSocket error for ${this.account.client_id}:`, error);
            });

            this.ws.on('close', (code, reason) => {
                console.log(`[OrderSocket] Connection closed for ${this.account.client_id}. Code: ${code}, Reason: ${reason}`);
                this.isConnected = false;
                this.stopPing();
                this.handleReconnect();
            });

        } catch (error) {
            console.error(`[OrderSocket] Connection failed for ${this.account.client_id}:`, error);
            this.handleReconnect();
        }
    }

    private startPing() {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                this.ws.send('ping');
            }
        }, 10000); // 10 seconds
    }

    private stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`[OrderSocket] Reconnecting for ${this.account.client_id} in ${delay / 1000}s (Attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error(`[OrderSocket] Max reconnect attempts reached for ${this.account.client_id}`);
        }
    }

    private handleOrderUpdate(data: any) {
        if (!data || !data.orderData) return;

        const order = data.orderData;
        const exchange = data.exchange;
        const orderStatus = data['order-status']; // e.g., AB01 (open), AB02 (cancelled), AB04 (modified), AB05 (complete)

        console.log(`[OrderSocket] Update for ${this.account.client_id}: Status=${orderStatus}, ID=${order.orderid}, Symbol=${order.tradingsymbol}`);

        // We only care about Master orders that weren't placed by our own app to avoid loops.
        // Process based on status
        this.checkAndProcessOrder(order, orderStatus);
    }

    private async checkAndProcessOrder(order: any, orderStatus: string) {
        try {
            // 1. Check if we already logged this order as 'app' source
            const { data: existingOrder } = await supabase
                .from('order_history')
                .select('id, source, status')
                .eq('broker_order_id', order.orderid)
                .single();

            // 2. Decide action based on orderStatus
            const isPlacementStatus = ['AB01', 'AB05', 'AB06'].includes(orderStatus);

            // If it's from our app and it's a placement, we ignore it (to avoid replication loops)
            if (existingOrder && existingOrder.source === 'app' && isPlacementStatus) {
                return;
            }

            // AB01 = open, AB05 = complete, AB06 = after market order req received
            if (isPlacementStatus && !existingOrder) {
                console.log(`[OrderSocket] Manual new order detected for Master ${this.account.client_id} (Status: ${orderStatus}). Replicating...`);
                // Ensure variety is passed (Angel One postback has 'variety')
                await replicateMasterOrder(this.account.id, order);
            } 
            // AB04 = modified
            else if (orderStatus === 'AB04') {
                console.log(`[OrderSocket] Manual modification detected for Master ${this.account.client_id}. Updating children...`);
                const { modifyReplicatedOrders } = require('../orders');
                await modifyReplicatedOrders(order.orderid, order);
            }
            // AB02 = cancelled, AB07 = cancelled after market order, AB08 = rejection? (usually cancel)
            else if (['AB02', 'AB07', 'AB08'].includes(orderStatus)) {
                if (existingOrder && existingOrder.status?.toLowerCase() === 'cancelled') {
                    return; // Already processed
                }
                console.log(`[OrderSocket] Manual cancellation detected for Master ${this.account.client_id} (Status: ${orderStatus}). Cancelling children...`);
                const { cancelReplicatedOrders } = require('../orders');
                await cancelReplicatedOrders(order.orderid);
            }
        } catch (err: any) {
            console.error(`[OrderSocket] Error processing order ${order.orderid}:`, err.message);
        }
    }

    disconnect() {
        this.stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}

class AngelOneOrderSocketManager {
    private sockets: Map<string, AngelOneOrderSocket> = new Map();
    private static instance: AngelOneOrderSocketManager;

    private constructor() {}

    public static getInstance(): AngelOneOrderSocketManager {
        if (!AngelOneOrderSocketManager.instance) {
            AngelOneOrderSocketManager.instance = new AngelOneOrderSocketManager();
        }
        return AngelOneOrderSocketManager.instance;
    }

    async init() {
        console.log('[OrderSocketManager] Initializing for all Master accounts...');
        const { data: masters, error } = await supabase
            .from('group_accounts')
            .select('demat_account_id')
            .eq('account_type', 'Master');

        if (error || !masters) return;

        const uniqueMasterIds = [...new Set(masters.map(m => m.demat_account_id))];

        for (const accountId of uniqueMasterIds) {
            const { data: account } = await supabase
                .from('demat_accounts')
                .select('*')
                .eq('id', accountId)
                .single();

            if (account) {
                this.startSocket(account);
            }
        }
    }

    async startSocket(account: any) {
        if (this.sockets.has(account.id)) return;

        const socket = new AngelOneOrderSocket(account);
        this.sockets.set(account.id, socket);
        await socket.connect();
    }

    stopSocket(accountId: string) {
        const socket = this.sockets.get(accountId);
        if (socket) {
            socket.disconnect();
            this.sockets.delete(accountId);
        }
    }
}

export const orderSocketManager = AngelOneOrderSocketManager.getInstance();
