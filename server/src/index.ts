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
import { placeOrder, createGTTRule, getOrderBook, getGTTRuleList, cancelOrder, cancelGTTRule } from './utils/brokers/angelone_orders';
import { loginAngelOne } from './utils/brokers/angelone';
import { supabase } from './utils/supabase';

const marketDataHandler = new AngelOneMarketData(io);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/demat/validate', async (req, res) => {
    try {
        const { client_id, totp_secret, api_key, password, mobile, email } = req.body;
        console.log(`[Demat] Validating credentials and profile for: ${client_id}`);

        // 1. DUPLICATE CHECK: Check if this client_id is already registered
        const { data: existing, error: checkError } = await supabase
            .from('demat_accounts')
            .select('id, user_id')
            .eq('client_id', client_id)
            .single();

        if (existing) {
            console.warn(`[Demat] Duplicate addition blocked: ${client_id} already exists.`);
            return res.status(400).json({
                success: false,
                message: `This Angel One ID (${client_id}) is already registered in the system.`
            });
        }

        const result = await loginAngelOne(client_id, totp_secret, api_key, password, true); // Strict Mode

        if (result.success && result.profile) {
            const profileMobile = result.profile.mobileno || '';
            const profileEmail = result.profile.email || '';

            console.log(`[Demat] DEBUG - Full Profile Data:`, JSON.stringify(result.profile));
            console.log(`[Demat] Cross-verifying: Input Mobile(${mobile}) vs Profile(${profileMobile}), Input Email(${email}) vs Profile(${profileEmail})`);

            const sanitizedInputMobile = mobile.replace(/\D/g, '').slice(-10);
            const sanitizedProfileMobile = profileMobile.replace(/\D/g, '').slice(-10);

            if (sanitizedInputMobile !== sanitizedProfileMobile && sanitizedProfileMobile !== '') {
                console.warn(`[Demat] FAILED: Mobile mismatch for ${client_id}`);
                return res.status(401).json({
                    success: false,
                    message: `Mobile number mismatch. Registered mobile ends with ...${sanitizedProfileMobile.slice(-4)}. Please use the exact registered mobile.`
                });
            }

            if (email.toLowerCase().trim() !== profileEmail.toLowerCase().trim() && profileEmail !== '') {
                console.warn(`[Demat] FAILED: Email mismatch for ${client_id}`);
                return res.status(401).json({
                    success: false,
                    message: `Email mismatch. Registered email is ${profileEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}. Please use the exact registered email.`
                });
            }

            console.log(`[Demat] SUCCESS: All credentials and profile details verified for ${client_id}`);
            res.json({ success: true, message: 'Credentials and Profile verified successfully' });
        } else {
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

// --- Order & GTT Endpoints ---

app.post('/api/orders/execute', async (req, res) => {
    try {
        const { user_id, params, variety = 'NORMAL' } = req.body;
        if (!user_id || !params) return res.status(400).json({ success: false, message: 'Missing parameters' });

        // Get demat account
        const { data: accounts } = await supabase
            .from('demat_accounts')
            .select('*')
            .eq('user_id', user_id)
            .eq('broker_name', 'angelone')
            .limit(1);

        if (!accounts || accounts.length === 0) return res.status(404).json({ success: false, message: 'Angel One account not found' });
        const account = accounts[0];

        // Ensure session
        const session = await loginAngelOne(account.client_id, account.totp_secret, account.api_key, account.password);
        if (!session.success) return res.status(401).json({ success: false, message: 'Failed to authenticate with Angel One' });

        const result = await placeOrder(session.access_token, account.api_key, { ...params, variety });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.post('/api/gtt/create', async (req, res) => {
    try {
        const { user_id, params } = req.body;
        if (!user_id || !params) return res.status(400).json({ success: false, message: 'Missing parameters' });

        const { data: accounts } = await supabase
            .from('demat_accounts')
            .select('*')
            .eq('user_id', user_id)
            .eq('broker_name', 'angelone')
            .limit(1);

        if (!accounts || accounts.length === 0) return res.status(404).json({ success: false, message: 'Angel One account not found' });
        const account = accounts[0];

        const session = await loginAngelOne(account.client_id, account.totp_secret, account.api_key, account.password);
        if (!session.success) return res.status(401).json({ success: false, message: 'Failed to authenticate with Angel One' });

        const result = await createGTTRule(session.access_token, account.api_key, params);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.get('/api/orders/book', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: 'Missing user_id' });

        const { data: accounts } = await supabase
            .from('demat_accounts')
            .select('*')
            .eq('user_id', user_id as string)
            .eq('broker_name', 'angelone')
            .limit(1);

        if (!accounts || accounts.length === 0) return res.status(404).json({ success: false, message: 'Angel One account not found' });
        const account = accounts[0];

        const session = await loginAngelOne(account.client_id, account.totp_secret, account.api_key, account.password);
        if (!session.success) return res.status(401).json({ success: false, message: 'Failed to authenticate with Angel One' });

        const result = await getOrderBook(session.access_token, account.api_key);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.get('/api/gtt/list', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: 'Missing user_id' });

        const { data: accounts } = await supabase
            .from('demat_accounts')
            .select('*')
            .eq('user_id', user_id as string)
            .eq('broker_name', 'angelone')
            .limit(1);

        if (!accounts || accounts.length === 0) return res.status(404).json({ success: false, message: 'Angel One account not found' });
        const account = accounts[0];

        const session = await loginAngelOne(account.client_id, account.totp_secret, account.api_key, account.password);
        if (!session.success) return res.status(401).json({ success: false, message: 'Failed to authenticate with Angel One' });

        const result = await getGTTRuleList(session.access_token, account.api_key);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.post('/api/orders/cancel', async (req, res) => {
    try {
        const { user_id, orderid, variety = 'NORMAL' } = req.body;
        if (!user_id || !orderid) return res.status(400).json({ success: false, message: 'Missing parameters' });

        const { data: accounts } = await supabase
            .from('demat_accounts')
            .select('*')
            .eq('user_id', user_id)
            .eq('broker_name', 'angelone')
            .limit(1);

        const account = accounts?.[0];
        if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

        const session = await loginAngelOne(account.client_id, account.totp_secret, account.api_key, account.password);
        const result = await cancelOrder(session.access_token, account.api_key, orderid, variety);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.post('/api/gtt/cancel', async (req, res) => {
    try {
        const { user_id, id, symboltoken, exchange } = req.body;
        const { data: accounts } = await supabase
            .from('demat_accounts')
            .select('*')
            .eq('user_id', user_id)
            .eq('broker_name', 'angelone')
            .limit(1);

        const account = accounts?.[0];
        if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

        const session = await loginAngelOne(account.client_id, account.totp_secret, account.api_key, account.password);
        const result = await cancelGTTRule(session.access_token, account.api_key, id, symboltoken, exchange);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Sync/Load instruments on startup
    loadInstruments();
});
