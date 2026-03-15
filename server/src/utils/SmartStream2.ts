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
        const safeReadBigInt64LE = (offset: number) => {
            if (offset + 8 <= buffer.length) return buffer.readBigInt64LE(offset);
            return BigInt(0);
        };

        const safeReadDoubleLE = (offset: number) => {
            if (offset + 8 <= buffer.length) return buffer.readDoubleLE(offset);
            return 0;
        };

        const safeReadInt8 = (offset: number) => {
            if (offset + 1 <= buffer.length) return buffer.readInt8(offset);
            return 0;
        };

        try {
            if (buffer.length < 2) return;

            const mode = safeReadInt8(0);
            const exchangeType = safeReadInt8(1);

            // Token is 25 bytes starting at index 2
            if (buffer.length < 27) return;
            let token = buffer.toString('utf8', 2, 27).replace(/\0/g, '').trim();

            if (buffer.length < 51) return; // Need at least sequence (8) + timestamp (8) + ltp (8)
            const sequenceNumber = safeReadBigInt64LE(27);
            const timestamp = safeReadBigInt64LE(35);
            const ltp = Number(safeReadBigInt64LE(43));

            const tick: any = {
                tk: token,
                e: exchangeType,
                m: mode,
                ltp: ltp,
                lp: ltp,
                sn: Number(sequenceNumber),
                ts: Number(timestamp)
            };

            // Size checks based on Angel One proto specifications
            if (mode >= 2 && buffer.length >= 123) { // Quote
                tick.ltq = Number(safeReadBigInt64LE(51));
                tick.atp = Number(safeReadBigInt64LE(59));
                tick.v = Number(safeReadBigInt64LE(67));
                tick.tbq = safeReadDoubleLE(75);
                tick.tsq = safeReadDoubleLE(83);
                tick.o = Number(safeReadBigInt64LE(91));
                tick.h = Number(safeReadBigInt64LE(99));
                tick.l = Number(safeReadBigInt64LE(107));
                tick.c = Number(safeReadBigInt64LE(115));
            }

            if (mode === 3 && buffer.length >= 379) { // SnapQuote
                tick.ltt = Number(safeReadBigInt64LE(123));
                tick.oi = Number(safeReadBigInt64LE(131));
                
                tick.uc = Number(safeReadBigInt64LE(347));
                tick.lc = Number(safeReadBigInt64LE(355));
                tick.h52 = Number(safeReadBigInt64LE(363));
                tick.l52 = Number(safeReadBigInt64LE(371));
            }

            this.emit('tick', tick);
        } catch (e: any) {
            // Silently ignore out of bounds during fragmentation, log others
            if (!e.message.includes('out of range') && !e.message.includes('outside buffer bounds')) {
                console.error('[SmartStream2] Binary parsing error:', e.message);
            }
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
