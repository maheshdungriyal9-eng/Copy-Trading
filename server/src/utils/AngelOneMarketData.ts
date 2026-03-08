import { WebSocketV2 } from "smartapi-javascript";
import { Server } from "socket.io";
import axios from 'axios';
import { supabase } from "./supabase";
import { loginAngelOne } from "./brokers/angelone";

export class AngelOneMarketData {
    private ws: any;
    private io: Server;
    private userId: string | null = null;
    private isConnected: boolean = false;
    private subscriptionQueue: any[] = [];
    private session: any = null;
    private account: any = null;

    constructor(io: Server) {
        this.io = io;
    }

    async initialize(userId: string) {
        if (this.userId === userId && this.isConnected) {
            console.log(`[MarketData] Already initialized for user: ${userId}`);
            return;
        }

        this.userId = userId;
        try {
            console.log(`[MarketData] Initializing for user: ${userId}`);
            const { data: accounts, error } = await supabase
                .from('demat_accounts')
                .select('*')
                .eq('user_id', userId)
                .eq('broker_name', 'angelone')
                .limit(1);

            if (error || !accounts || accounts.length === 0) {
                console.error('[MarketData] No Angel One account found');
                return;
            }

            this.account = accounts[0];
            await this.ensureSession();

            if (!this.session?.success) return;

            if (this.ws) {
                try { this.ws.close(); } catch (e) { }
            }

            this.ws = new WebSocketV2({
                jwttoken: this.session.access_token,
                apikey: this.account.api_key,
                clientcode: this.account.client_id,
                feedtype: this.session.feed_token
            });

            this.ws.connect();

            this.ws.on("connect", () => {
                console.log("[MarketData] WebSocket Connected");
                this.isConnected = true;
                if (this.subscriptionQueue.length > 0) {
                    console.log(`[MarketData] Processing ${this.subscriptionQueue.length} queued subscriptions`);
                    this.subscriptionQueue.forEach(tokens => this.subscribe(tokens));
                    this.subscriptionQueue = [];
                }
            });

            this.ws.on("tick", (tick: any) => {
                this.io.emit('market_data', tick);
            });

            this.ws.on("error", (err: any) => {
                console.error("[MarketData] WebSocket Error:", err);
                this.isConnected = false;
            });

        } catch (err) {
            console.error("[MarketData] Failed to initialize:", err);
        }
    }

    private async ensureSession() {
        if (this.session && this.session.success) return;

        console.log(`[MarketData] Generating new Angel One session for ${this.account.client_id}`);
        this.session = await loginAngelOne(
            this.account.client_id,
            this.account.totp_secret,
            this.account.api_key,
            this.account.password
        );
        return this.session;
    }

    subscribe(tokens: { exchangeType: number, tokens: string[] }[]) {
        if (!this.isConnected || !this.ws) {
            console.log("[MarketData] WebSocket not connected, queuing subscription");
            this.subscriptionQueue.push(tokens);
            return;
        }

        console.log("[MarketData] Subscribing:", JSON.stringify(tokens));
        this.ws.subscribe({
            correlationId: "watchlist",
            action: 1,
            mode: 3,
            exchangeTokens: tokens
        });
    }

    async getQuote(mode: 'FULL' | 'OHLC' | 'LTP', exchangeTokens: any) {
        try {
            // Ensure we have an account and session even if initialize(userId) hasn't finished
            if (!this.account || !this.session) {
                console.log("[MarketData] getQuote triggered before full initialization, attempting late init...");
                // Note: We need userId for this, but if we don't have it, we use the last one
                if (!this.userId) return { success: false, message: "User session not found" };

                const { data: accounts } = await supabase
                    .from('demat_accounts')
                    .select('*')
                    .eq('user_id', this.userId)
                    .eq('broker_name', 'angelone')
                    .limit(1);

                if (!accounts || accounts.length === 0) return { success: false, message: "Account not found" };
                this.account = accounts[0];
                await this.ensureSession();
            } else {
                await this.ensureSession();
            }

            console.log(`[MarketData] Fetching ${mode} quote for:`, JSON.stringify(exchangeTokens));

            const response = await axios.post(
                "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
                {
                    mode,
                    exchangeTokens
                },
                {
                    headers: {
                        "X-PrivateKey": this.account.api_key,
                        "Accept": "application/json",
                        "X-SourceID": "WEB",
                        "X-ClientLocalIP": "127.0.0.1",
                        "X-ClientPublicIP": "127.0.0.1",
                        "X-MACAddress": "00-00-00-00-00-00",
                        "X-UserType": "USER",
                        "Authorization": `Bearer ${this.session.access_token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            console.log(`[MarketData] ${mode} Quote Result status: ${response.data.status}`);
            return response.data;
        } catch (err: any) {
            console.error("[MarketData] Failed to fetch quote:", err.response?.data || err.message);
            return { success: false, message: err.message };
        }
    }
}
