import { WebSocketV2 } from "smartapi-javascript";
import { Server } from "socket.io";
import { supabase } from "./supabase";
import { loginAngelOne } from "./brokers/angelone";

export class AngelOneMarketData {
    private ws: any;
    private io: Server;
    private userId: string | null = null;
    private isConnected: boolean = false;
    private subscriptionQueue: any[] = [];

    constructor(io: Server) {
        this.io = io;
    }

    async initialize(userId: string) {
        if (this.userId === userId && this.isConnected) {
            console.log("Market data already initialized for this user");
            return;
        }

        this.userId = userId;
        try {
            const { data: accounts, error } = await supabase
                .from('demat_accounts')
                .select('*')
                .eq('user_id', userId)
                .eq('broker_name', 'angelone')
                .limit(1);

            if (error || !accounts || accounts.length === 0) {
                console.error('No Angel One account found for market data');
                return;
            }

            const account = accounts[0];
            const session = await loginAngelOne(
                account.client_id,
                account.totp_secret,
                account.api_key,
                account.password
            );

            if (!session.success) return;

            this.ws = new WebSocketV2({
                jwttoken: session.access_token,
                apikey: account.api_key,
                clientcode: account.client_id,
                feedtype: session.feed_token
            });

            this.ws.connect();

            this.ws.on("connect", () => {
                console.log("Angel One WebSocket Connected");
                this.isConnected = true;
                // Process queued subscriptions
                if (this.subscriptionQueue.length > 0) {
                    console.log(`Processing ${this.subscriptionQueue.length} queued subscriptions`);
                    this.subscriptionQueue.forEach(tokens => this.subscribe(tokens));
                    this.subscriptionQueue = [];
                }
            });

            this.ws.on("tick", (tick: any) => {
                this.io.emit('market_data', tick);
            });

            this.ws.on("error", (err: any) => {
                console.error("Angel One WebSocket Error:", err);
                this.isConnected = false;
            });

        } catch (err) {
            console.error("Failed to initialize Angel One Market Data:", err);
        }
    }

    subscribe(tokens: { exchangeType: number, tokens: string[] }[]) {
        if (!this.isConnected || !this.ws) {
            console.log("WebSocket not connected, queuing subscription");
            this.subscriptionQueue.push(tokens);
            return;
        }

        console.log("Sending subscription to Angel One (QUOTE mode):", JSON.stringify(tokens));
        this.ws.subscribe({
            correlationId: "watchlist",
            action: 1,
            mode: 3, // 3 for Quote (OHLC + LTP)
            exchangeTokens: tokens
        });
    }
}
