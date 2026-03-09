import WebSocket from 'ws';
import EventEmitter from 'events';

export class SmartStream2 extends EventEmitter {
    private ws: WebSocket | null = null;
    private url: string = 'wss://smartapisocket.angelone.in/smart-stream';
    private pingInterval: NodeJS.Timeout | null = null;
    private config: {
        clientCode: string;
        feedToken: string;
        apiKey: string;
        jwtToken: string;
    };

    constructor(config: { clientCode: string; feedToken: string; apiKey: string; jwtToken: string }) {
        super();
        this.config = config;
    }

    connect() {
        const fullUrl = `${this.url}?clientCode=${this.config.clientCode}&feedToken=${this.config.feedToken}&apiKey=${this.config.apiKey}`;

        console.log(`[SmartStream2] Connecting to ${this.url}`);
        this.ws = new WebSocket(fullUrl, {
            headers: {
                'Authorization': `Bearer ${this.config.jwtToken}`,
                'x-api-key': this.config.apiKey,
                'x-client-code': this.config.clientCode,
                'x-feed-token': this.config.feedToken
            }
        });

        this.ws.on('open', () => {
            console.log('[SmartStream2] Connection established');
            this.emit('connected');
            this.startHeartbeat();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
            if (typeof data === 'string') {
                if (data === 'pong') {
                    // console.log('[SmartStream2] Pong received');
                    return;
                }
                try {
                    const json = JSON.parse(data);
                    if (json.errorCode) {
                        console.error('[SmartStream2] Server Error:', json);
                        this.emit('error', json);
                    }
                } catch (e) {
                    // Ignore non-json strings
                }
            } else if (Buffer.isBuffer(data)) {
                this.parseBinary(data);
            }
        });

        this.ws.on('error', (error) => {
            console.error('[SmartStream2] WebSocket Error:', error);
            this.emit('error', error);
        });

        this.ws.on('close', () => {
            console.log('[SmartStream2] Connection closed');
            this.stopHeartbeat();
            this.emit('disconnected');
        });
    }

    private startHeartbeat() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send('ping');
            }
        }, 30000);
    }

    private stopHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    subscribe(mode: number, tokens: { exchangeType: number, tokens: string[] }[]) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const request = {
            action: 1,
            params: {
                mode: mode,
                tokenList: tokens
            }
        };

        this.ws.send(JSON.stringify(request));
    }

    unsubscribe(mode: number, tokens: { exchangeType: number, tokens: string[] }[]) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const request = {
            action: 0,
            params: {
                mode: mode,
                tokenList: tokens
            }
        };

        this.ws.send(JSON.stringify(request));
    }

    private parseBinary(buffer: Buffer) {
        try {
            const mode = buffer.readInt8(0);
            const exchangeType = buffer.readInt8(1);

            // Token is 25 bytes starting at index 2
            let token = buffer.toString('utf8', 2, 27).replace(/\0/g, '').trim();

            const sequenceNumber = buffer.readBigInt64LE(27);
            const timestamp = buffer.readBigInt64LE(35);

            // LTP is at index 43, size 8 bytes, but docs say int32. 
            // Let's read it as BigInt64LE based on the index map provided.
            const ltp = Number(buffer.readBigInt64LE(43));

            const tick: any = {
                tk: token,
                e: exchangeType,
                m: mode,
                ltp: ltp,
                lp: ltp, // Dual key for frontend compatibility
                sn: Number(sequenceNumber),
                ts: Number(timestamp)
            };

            if (mode >= 2) { // Quote or SnapQuote
                tick.ltq = Number(buffer.readBigInt64LE(51));
                tick.atp = Number(buffer.readBigInt64LE(59));
                tick.v = Number(buffer.readBigInt64LE(67));
                tick.tbq = buffer.readDoubleLE(75);
                tick.tsq = buffer.readDoubleLE(83);
                tick.o = Number(buffer.readBigInt64LE(91));
                tick.h = Number(buffer.readBigInt64LE(99));
                tick.l = Number(buffer.readBigInt64LE(107));
                tick.c = Number(buffer.readBigInt64LE(115));
            }

            if (mode === 3) { // SnapQuote
                tick.ltt = Number(buffer.readBigInt64LE(123));
                tick.oi = Number(buffer.readBigInt64LE(131));
                // Index 139 is OI Change (double), usually garbage as per docs

                // Best Five Data starts at index 147
                // (Omitted for now to keep payload light unless needed)

                tick.uc = Number(buffer.readBigInt64LE(347));
                tick.lc = Number(buffer.readBigInt64LE(355));
                tick.h52 = Number(buffer.readBigInt64LE(363));
                tick.l52 = Number(buffer.readBigInt64LE(371));
            }

            this.emit('tick', tick);
        } catch (e) {
            console.error('[SmartStream2] Binary parsing failed:', e);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.stopHeartbeat();
    }
}
