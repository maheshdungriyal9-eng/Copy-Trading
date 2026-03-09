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
        // Even if userId is same, we might want to refresh account data if they updated it
        console.log(`[MarketData] Initializing for user: ${userId}`);
        this.userId = userId;

        try {
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

            // Check if account has changed (API Key, etc.)
            const newAccount = accounts[0];
            if (this.account && (this.account.api_key !== newAccount.api_key || this.account.client_id !== newAccount.client_id)) {
                console.log(`[MarketData] Account credentials changed, clearing session...`);
                this.session = null;
                this.isConnected = false;
            }

            this.account = newAccount;
            await this.ensureSession();

            if (!this.session?.success) return;

            // Only reconnect if not already connected or account changed
            if (this.ws && this.isConnected) {
                console.log("[MarketData] WebSocket already connected and account unchanged.");
            } else {
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
                    // Log first few ticks to see the structure
                    if (Math.random() < 0.05) console.log("[MarketData] Sample Tick:", JSON.stringify(tick));
                    this.io.emit('market_data', tick);
                });

                this.ws.on("error", (err: any) => {
                    console.error("[MarketData] WebSocket Error:", err);
                    this.isConnected = false;
                });
            }

        } catch (err) {
            console.error("[MarketData] Failed to initialize:", err);
        }
    }

    private async ensureSession() {
        if (this.session && this.session.success) return;

        console.log(`[MarketData] Generating new Angel One session for ${this.account.client_id}`);
        try {
            this.session = await loginAngelOne(
                this.account.client_id,
                this.account.totp_secret,
                this.account.api_key,
                this.account.password
            );
        } catch (err: any) {
            console.error(`[MarketData] Session generation failed:`, err.message || err);
            this.session = { success: false, message: err.message || 'Login failed' };
        }
        return this.session;
    }

    subscribe(tokens: { exchangeType: number, tokens: string[] }[]) {
        if (!this.isConnected || !this.ws) {
            console.log("[MarketData] WebSocket not connected, queuing subscription");
            this.subscriptionQueue.push(tokens);
            return;
        }

        // Convert array format to the Map format SmartAPI V2 expects
        const exchangeTokens: any = {};
        tokens.forEach(item => {
            if (!exchangeTokens[item.exchangeType]) {
                exchangeTokens[item.exchangeType] = [];
            }
            exchangeTokens[item.exchangeType].push(...item.tokens);
        });

        console.log("[MarketData] Subscribing with Map:", JSON.stringify(exchangeTokens));
        this.ws.subscribe({
            correlationId: "watchlist",
            action: 1,
            mode: 3,
            exchangeTokens: exchangeTokens
        });
    }

    async getQuote(mode: 'FULL' | 'OHLC' | 'LTP', exchangeTokens: any) {
        try {
            if (!this.account || !this.session) {
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
                { mode, exchangeTokens },
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

            // SPECIAL CASE: If API Key is invalid (AG8004), clear session to force refresh next time
            if (response.data?.errorCode === 'AG8004' || response.data?.status === false) {
                console.warn(`[MarketData] API Error ${response.data?.errorCode}: ${response.data?.message}. Resetting session.`);
                this.session = null;
            }

            return response.data;
        } catch (err: any) {
            const errorInfo = err.response?.data || { message: err.message };
            console.error("[MarketData] Failed to fetch quote:", errorInfo);

            // If it's a 401 or specific error code, clear session
            if (errorInfo.errorCode === 'AG8004' || err.response?.status === 401) {
                this.session = null;
            }

            return errorInfo;
        }
    }
}
