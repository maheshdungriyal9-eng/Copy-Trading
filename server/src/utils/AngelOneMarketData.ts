import { Server } from "socket.io";
import axios from 'axios';
import { supabase } from "./supabase";
import { loginAngelOne } from "./brokers/angelone";
import { SmartStream2 } from "./SmartStream2";

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

    async initialize(userId: string, socketId: string) {
        console.log(`[MarketData] Initializing for user: ${userId}, socket: ${socketId}`);
        this.userId = userId;

        try {
            // Join user room
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join(userId);
                console.log(`[MarketData] Socket ${socketId} joined room ${userId}`);
            }

            if (this.isConnected && this.ws) {
                console.log(`[MarketData] Already connected for user ${userId}.`);
                this.io.to(userId).emit('market_status', { status: 'connected' });
                return;
            }
            const { data: accounts, error } = await supabase
                .from('demat_accounts')
                .select('*')
                .eq('user_id', userId)
                .eq('broker_name', 'angelone')
                .limit(1);

            if (error || !accounts || accounts.length === 0) {
                console.error('[MarketData] No Angel One account found');
                this.io.to(userId).emit('market_status', { status: 'error', message: 'No Angel One account' });
                return;
            }

            this.account = accounts[0];
            this.io.to(userId).emit('market_status', { status: 'connecting' });

            await this.ensureSession();
            if (!this.session?.success) {
                this.io.to(userId).emit('market_status', { status: 'error', message: 'Auth failed' });
                return;
            }

            this.connectWebSocket();
        } catch (err) {
            console.error("[MarketData] Failed to initialize:", err);
            this.io.to(userId).emit('market_status', { status: 'error' });
        }
    }

    private connectWebSocket() {
        if (this.ws) {
            try { this.ws.disconnect(); } catch (e) { }
        }

        this.ws = new SmartStream2({
            jwtToken: this.session.access_token,
            apiKey: this.account.api_key,
            clientCode: this.account.client_id,
            feedToken: this.session.feed_token
        });

        this.ws.connect();

        this.ws.on("connected", () => {
            console.log(`[MarketData] SmartStream2 Connected for room: ${this.userId}`);
            this.isConnected = true;
            this.io.to(this.userId!).emit('market_status', { status: 'connected' });

            if (this.subscriptionQueue.length > 0) {
                console.log(`[MarketData] Processing ${this.subscriptionQueue.length} queued subscriptions`);
                this.subscriptionQueue.forEach(tokens => this.subscribe(tokens));
                this.subscriptionQueue = [];
            }
        });

        this.ws.on("tick", (tick: any) => {
            // Health log: 1 in 100 ticks
            if (Math.random() < 0.01) console.log(`[MarketData] Broadcasting tick for ${tick.tk} to room ${this.userId}`);
            this.io.to(this.userId!).emit('market_data', tick);
        });

        this.ws.on("error", (err: any) => {
            console.error(`[MarketData] SmartStream2 Error (${this.userId}):`, err);
            // Don't set isConnected=false immediately, let close handler handle it
        });

        this.ws.on("disconnected", () => {
            console.log(`[MarketData] SmartStream2 Closed for room: ${this.userId}`);
            this.isConnected = false;
            if (this.userId) {
                console.log(`[MarketData] Reconnecting room ${this.userId} in 5s...`);
                setTimeout(() => {
                    if (this.userId && !this.isConnected) {
                        this.connectWebSocket();
                    }
                }, 5000);
            }
        });
    }

    public disconnect() {
        this.userId = null;
        if (this.ws) {
            try { this.ws.close(); } catch (e) { }
            this.ws = null;
        }
    }

    public async getHistoricalData(params: {
        exchange: string,
        symboltoken: string,
        interval: string,
        fromdate: string,
        todate: string
    }) {
        await this.ensureSession();
        if (!this.session?.success) {
            throw new Error("Failed to establish session for historical data");
        }

        try {
            const config = {
                method: 'post',
                url: 'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
                headers: {
                    'X-PrivateKey': this.account.api_key,
                    'Accept': 'application/json',
                    'X-SourceID': 'WEB',
                    'X-ClientLocalIP': '127.0.0.1',
                    'X-ClientPublicIP': '127.0.0.1',
                    'X-MACAddress': 'MAC_ADDRESS',
                    'X-UserType': 'USER',
                    'Authorization': `Bearer ${this.session.access_token}`,
                    'Content-Type': 'application/json'
                },
                data: params
            };

            const response = await axios(config);
            return response.data;
        } catch (err: any) {
            console.error(`[MarketData] Historical data fetch failed:`, err.response?.data || err.message);
            throw err;
        }
    }

    public async ensureSession() {
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
            console.log("[MarketData] SmartStream2 not connected, queuing subscription");
            this.subscriptionQueue.push(tokens);
            return;
        }

        console.log("[MarketData] Subscribing via SmartStream2 (Mode 3):", JSON.stringify(tokens));
        this.ws.subscribe(3, tokens);
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

    async getLtpData(exchange: string, tradingsymbol: string, symboltoken: string) {
        try {
            await this.ensureSession();
            const response = await axios.post(
                "https://apiconnect.angelone.in/order-service/rest/secure/angelbroking/order/v1/getLtpData",
                { exchange, tradingsymbol, symboltoken },
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
            return response.data;
        } catch (err: any) {
            console.error("[MarketData] getLtpData failed:", err.message);
            return { status: false, message: err.message };
        }
    }

    getAccountDetails() {
        return this.account;
    }
}
