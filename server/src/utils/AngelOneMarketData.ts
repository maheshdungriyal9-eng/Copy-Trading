import { WebSocketV2 } from "smartapi-javascript";
import { Server } from "socket.io";
import { supabase } from "./supabase";
import { loginAngelOne } from "./brokers/angelone";

export class AngelOneMarketData {
    private ws: any;
    private io: Server;
    private userId: string | null = null;
    private isConnected: boolean = false;

    constructor(io: Server) {
        this.io = io;
    }

    async initialize(userId: string) {
        this.userId = userId;
        try {
            // Fetch user's first demat account for market data
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

            // Login to get fresh tokens
            // In a real app, we'd manage sessions better
            const session = await loginAngelOne(
                account.client_id,
                account.totp_secret,
                account.api_key,
                account.password // Assuming password is the PIN
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
                // Subscribe to some default symbols if needed
            });

            this.ws.on("tick", (tick: any) => {
                // Broadcast ticks to frontend
                this.io.emit('market_data', tick);
            });

            this.ws.on("error", (err: any) => {
                console.error("Angel One WebSocket Error:", err);
            });

        } catch (err) {
            console.error("Failed to initialize Angel One Market Data:", err);
        }
    }

    subscribe(tokens: { exchangeType: number, tokens: string[] }[]) {
        if (this.isConnected && this.ws) {
            this.ws.subscribe({
                correlationId: "watchlist",
                action: 1, // 1 for subscribe
                mode: 1, // 1 for LTP
                exchangeTokens: tokens
            });
        }
    }
}
