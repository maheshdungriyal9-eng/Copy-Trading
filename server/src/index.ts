import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
});

app.use(cors());
app.use(express.json());

import { executeGroupOrder } from './utils/orders';
import { AngelOneMarketData } from './utils/AngelOneMarketData';
import { syncInstruments, loadInstruments, searchInstruments } from './utils/instruments';

const marketDataHandler = new AngelOneMarketData(io);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/orders/execute-group', async (req, res) => {
    try {
        const { groupId, symbol, exchange, transactionType, orderType, productType, quantity, price } = req.body;
        const result = await executeGroupOrder(groupId, {
            symbol, exchange, transactionType, orderType, productType, quantity, price
        });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/instruments/search', (req, res) => {
    const { query } = req.query;
    const instruments = searchInstruments(query as string);
    res.json(instruments);
});

app.post('/api/instruments/sync', async (req, res) => {
    try {
        await syncInstruments();
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/market/quote', async (req, res) => {
    try {
        const { mode, exchangeTokens } = req.body;
        const result = await marketDataHandler.getQuote(mode, exchangeTokens);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Initialize market data for the user if they provide their userId
    socket.on('init_market_data', async (userId: string) => {
        console.log(`Initializing market data for user: ${userId}`);
        await marketDataHandler.initialize(userId);
    });

    socket.on('subscribe_symbols', (tokens: any) => {
        console.log('Subscribing to tokens:', tokens);
        marketDataHandler.subscribe(tokens);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Sync/Load instruments on startup
    loadInstruments();
});
