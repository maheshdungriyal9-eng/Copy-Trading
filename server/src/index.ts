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
import { loginAngelOne } from './utils/brokers/angelone';

const marketDataHandler = new AngelOneMarketData(io);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/demat/validate', async (req, res) => {
    try {
        const { client_id, totp_secret, api_key, password, mobile, email } = req.body;
        console.log(`[Demat] Validating credentials and profile for: ${client_id}`);

        const result = await loginAngelOne(client_id, totp_secret, api_key, password, true); // Strict Mode

        if (result.success && result.profile) {
            const profileMobile = result.profile.mobileno || '';
            const profileEmail = result.profile.email || '';

            console.log(`[Demat] Cross-verifying: Input Mobile(${mobile}) vs Profile(${profileMobile}), Input Email(${email}) vs Profile(${profileEmail})`);

            const sanitizedInputMobile = mobile.replace(/\D/g, '').slice(-10);
            const sanitizedProfileMobile = profileMobile.replace(/\D/g, '').slice(-10);

            if (sanitizedInputMobile !== sanitizedProfileMobile && sanitizedProfileMobile !== '') {
                console.warn(`[Demat] Mobile mismatch for ${client_id}`);
                return res.status(401).json({
                    success: false,
                    message: `Mobile number mismatch. Registered mobile ends with ...${sanitizedProfileMobile.slice(-4)}. Please use the exact mobile number registered with this Angel ID.`
                });
            }

            if (email.toLowerCase().trim() !== profileEmail.toLowerCase().trim() && profileEmail !== '') {
                console.warn(`[Demat] Email mismatch for ${client_id}`);
                return res.status(401).json({
                    success: false,
                    message: `Email mismatch. Registered email is ${profileEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}. Please use the exact email registered with this Angel ID.`
                });
            }

            res.json({ success: true, message: 'Credentials and Profile verified successfully' });
        } else {
            // This part should technically be unreachable if requireProfile=true throws on failure,
            // but we keep it for safety.
            res.status(401).json({ success: false, message: 'Profile verification failed. Please check your API Key and credentials.' });
        }
    } catch (error: any) {
        console.error('[Demat] Validation error:', error.message || error);
        res.status(401).json({ success: false, message: error.message || 'Login failed' });
    }
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
