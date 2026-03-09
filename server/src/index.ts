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

import { executeGroupOrder, replicateMasterOrder } from './utils/orders';
import { AngelOneMarketData } from './utils/AngelOneMarketData';
import { syncInstruments, loadInstruments, searchInstruments, searchScripAPI } from './utils/instruments';
import { placeOrder, createGTTRule, getOrderBook, getGTTRuleList, cancelOrder, cancelGTTRule, getTradeBook, getOrderDetails, getLtpData, getRMS, getPositions, getHoldings, getAllHoldings, convertPosition } from './utils/brokers/angelone_orders';
import { loginAngelOne } from './utils/brokers/angelone';
import { supabase } from './utils/supabase';

const marketDataHandlers = new Map<string, AngelOneMarketData>();
const socketToUser = new Map<string, string>();
const clientCodeToUser = new Map<string, string>(); // Map Angel One Client ID to System User ID

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
        const { groupId, symbol, exchange, transactionType, orderType, productType, quantity, price, userId, tradingsymbol, symboltoken } = req.body;
        console.log(`[API] Executing group order for group: ${groupId}, symbol: ${tradingsymbol}`);
        const result = await executeGroupOrder(groupId, {
            symbol, exchange, transactionType, orderType, productType, quantity, price, tradingsymbol, symboltoken
        }, userId);
        res.json(result);
    } catch (error: any) {
        console.error('[API] Group order execution failed:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/instruments/search', async (req, res) => {
    const { query, userId } = req.query;

    // If userId is provided, try Angel One's searchScrip API for better performance and relevance
    if (userId) {
        try {
            const { data: accounts } = await supabase
                .from('demat_accounts')
                .select('*')
                .eq('user_id', userId)
                .eq('broker_name', 'angelone')
                .limit(1);

            if (accounts && accounts.length > 0) {
                const account = accounts[0];
                const handler = marketDataHandlers.get(userId as string);

                if (handler) {
                    const session = await (handler as any).ensureSession();
                    if (session && session.success) {
                        // Search across major exchanges
                        const exchanges = ['NSE', 'BSE', 'NFO', 'MCX'];
                        const results = await Promise.all(
                            exchanges.map(ex => searchScripAPI(ex, query as string, account.api_key, session.access_token))
                        );

                        // Flatten and format results to match Instrument interface
                        const flattened = results.flat().map(inst => ({
                            token: inst.symboltoken,
                            symbol: inst.tradingsymbol,
                            name: inst.tradingsymbol, // API returns tradingsymbol, use it for name too
                            expiry: '',
                            strike: '',
                            lotsize: '1',
                            instrumenttype: '',
                            exch_seg: inst.exchange,
                            tick_size: ''
                        }));

                        if (flattened.length > 0) {
                            return res.json(flattened);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[Search] API Search failed, falling back to local:', error);
        }
    }

    // Fallback to local instrument search
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
        const { mode, exchangeTokens, userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        let handler = marketDataHandlers.get(userId);
        if (!handler) {
            handler = new AngelOneMarketData(io);
            marketDataHandlers.set(userId, handler);
        }
        const result = await handler.getQuote(mode, exchangeTokens);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/market/historical', async (req, res) => {
    try {
        const { userId, exchange, symboltoken, interval, fromdate, todate } = req.body;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        let handler = marketDataHandlers.get(userId);
        if (!handler) {
            handler = new AngelOneMarketData(io);
            marketDataHandlers.set(userId, handler);
        }

        const result = await handler.getHistoricalData({
            exchange,
            symboltoken,
            interval,
            fromdate,
            todate
        });
        res.json(result);
    } catch (error: any) {
        console.error('[API] Historical data error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('init_market_data', async (userId: string) => {
        console.log(`[Socket] Initializing market data for user: ${userId}`);

        let handler = marketDataHandlers.get(userId);
        if (!handler) {
            handler = new AngelOneMarketData(io);
            marketDataHandlers.set(userId, handler);
        }

        socketToUser.set(socket.id, userId);
        await handler.initialize(userId, socket.id);

        // Map clientCode for webhook routing
        const account = handler.getAccountDetails();
        if (account && account.client_id) {
            console.log(`[Socket] Mapping clientCode ${account.client_id} to user ${userId}`);
            clientCodeToUser.set(account.client_id, userId);
        }
    });

    socket.on('subscribe_symbols', (tokens: any) => {
        const userId = socketToUser.get(socket.id);
        if (userId) {
            const handler = marketDataHandlers.get(userId);
            if (handler) {
                console.log(`[Socket] Subscribing for user: ${userId}`);
                handler.subscribe(tokens);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const userId = socketToUser.get(socket.id);
        if (userId) {
            socketToUser.delete(socket.id);
            // Optional: Cleanup handler if no more sockets for this user
        }
    });
});

// --- Order & GTT Endpoints ---

app.post('/api/orders/execute', async (req, res) => {
    try {
        const { user_id, params, variety = 'NORMAL', account_id } = req.body;
        if (!user_id || !params) return res.status(400).json({ success: false, message: 'Missing parameters' });

        console.log(`[API] Order Request: User=${user_id}, Variety=${variety}, Symbol=${params.tradingsymbol}`);

        // Get demat account
        let query = supabase
            .from('demat_accounts')
            .select('*')
            .eq('user_id', user_id);

        if (account_id) {
            query = query.eq('id', account_id);
        } else {
            query = query.eq('broker_name', 'angelone').limit(1);
        }

        const { data: accounts } = await query;

        if (!accounts || accounts.length === 0) return res.status(404).json({ success: false, message: 'Angel One account not found' });
        const account = accounts[0];

        // Ensure session
        const session = await loginAngelOne(account.client_id, account.totp_secret, account.api_key, account.password);
        if (!session.success) return res.status(401).json({ success: false, message: 'Failed to authenticate with Angel One' });

        let result;
        if (variety === 'GTT') {
            console.log('[API] Routing to GTT Create');
            // Adapt params for GTT if needed (GTT expects qty, triggerprice, etc.)
            const gttParams = {
                tradingsymbol: params.tradingsymbol,
                symboltoken: params.symboltoken,
                exchange: params.exchange,
                transactiontype: params.transactiontype,
                producttype: params.producttype,
                price: params.price,
                qty: params.quantity,
                triggerprice: params.triggerprice || params.price, // Fallback to price if trigger missing
                disclosedqty: params.quantity
            };
            result = await createGTTRule(session.access_token, account.api_key, gttParams as any);
        } else {
            const orderParams: any = {
                variety: variety,
                tradingsymbol: params.tradingsymbol,
                symboltoken: params.symboltoken,
                transactiontype: params.transactiontype,
                exchange: params.exchange,
                ordertype: params.ordertype,
                producttype: params.producttype,
                duration: params.duration || 'DAY',
                price: params.price?.toString() || '0',
                quantity: params.quantity?.toString(),
                squareoff: "0",
                stoploss: "0"
            };
            if (params.triggerprice && params.triggerprice !== '') {
                orderParams.triggerprice = params.triggerprice.toString();
            }
            if (params.disclosedquantity && params.disclosedquantity !== '') {
                orderParams.disclosedquantity = params.disclosedquantity.toString();
            }

            result = await placeOrder(session.access_token, account.api_key, orderParams);
        }

        console.log('[API] Broker Response:', JSON.stringify(result));

        if (result.status || result.message === 'SUCCESS') {
            await supabase.from('order_history').insert({
                user_id,
                symbol: `${params.exchange}:${params.tradingsymbol}`,
                buy_sell: params.transactiontype,
                quantity: parseInt(params.quantity),
                price: parseFloat(params.price) || 0,
                status: variety === 'GTT' ? 'GTT Created' : 'Success',
                broker_order_id: result.data?.orderid || result.data?.id || 'OK',
                executed_at: new Date().toISOString(),
                demat_account_id: account.id,
                source: 'app'
            });
        }

        res.json(result);
    } catch (error: any) {
        console.error('[API] Execution Error:', error);
        res.status(500).json({ success: false, message: error.message || error.errorstack || 'Internal Server Error' });
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

        if (result.status) {
            await supabase.from('order_history').insert({
                user_id,
                symbol: `${params.exchange}:${params.tradingsymbol}`,
                buy_sell: params.transactiontype,
                quantity: parseInt(params.qty),
                price: parseFloat(params.price) || 0,
                status: 'GTT Created',
                broker_order_id: result.data.id,
                executed_at: new Date().toISOString(),
                demat_account_id: account.id,
                source: 'app'
            });
        }

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

app.get('/api/orders/tradebook', async (req, res) => {
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

        const result = await getTradeBook(session.access_token, account.api_key);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.get('/api/orders/details', async (req, res) => {
    try {
        const { user_id, uniqueorderid } = req.query;
        if (!user_id || !uniqueorderid) return res.status(400).json({ success: false, message: 'Missing parameters' });

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

        const result = await getOrderDetails(session.access_token, account.api_key, uniqueorderid as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.get('/api/portfolio/positions', async (req, res) => {
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

        const result = await getPositions(session.access_token, account.api_key);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.get('/api/portfolio/holdings', async (req, res) => {
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

        const result = await getHoldings(session.access_token, account.api_key);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.get('/api/portfolio/all-holdings', async (req, res) => {
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

        const result = await getAllHoldings(session.access_token, account.api_key);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.post('/api/portfolio/convert', async (req, res) => {
    try {
        const { user_id, ...params } = req.body;
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

        const result = await convertPosition(session.access_token, account.api_key, params);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.post('/api/orders/ltp', async (req, res) => {
    try {
        const { user_id, exchange, tradingsymbol, symboltoken } = req.body;
        if (!user_id || !exchange || !tradingsymbol || !symboltoken) return res.status(400).json({ success: false, message: 'Missing parameters' });

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

        const result = await getLtpData(session.access_token, account.api_key, { exchange, tradingsymbol, symboltoken });
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

app.get('/api/demat/summary/:account_id', async (req, res) => {
    try {
        const { account_id } = req.params;
        const { data: account, error: accError } = await supabase
            .from('demat_accounts')
            .select('*')
            .eq('id', account_id)
            .single();

        if (accError || !account) return res.status(404).json({ success: false, message: 'Account not found' });

        const session = await loginAngelOne(account.client_id, account.totp_secret, account.api_key, account.password);
        if (!session.success) return res.status(401).json({ success: false, message: 'Failed to authenticate' });

        // Concurrently fetch all required data
        const [rms, positions, orderBook, groupsCount] = await Promise.all([
            getRMS(session.access_token, account.api_key),
            getPositions(session.access_token, account.api_key),
            getOrderBook(session.access_token, account.api_key),
            supabase.from('group_accounts').select('id', { count: 'exact' }).eq('demat_account_id', account_id)
        ]);

        // Process Results
        const orders = orderBook.data || [];
        const stats = {
            margin: rms.data?.net || '0',
            pnl: positions.data?.netpnl || '0',
            positions_count: positions.data?.length || 0,
            in_group: groupsCount.count || 0,
            counts: {
                total: orders.length,
                pending: orders.filter((o: any) => o.status === 'open' || o.status === 'validation pending').length,
                complete: orders.filter((o: any) => o.status === 'complete').length,
                reject: orders.filter((o: any) => o.status === 'rejected').length,
                cancel: orders.filter((o: any) => o.status === 'cancelled').length,
            }
        };

        res.json({ success: true, data: stats });
    } catch (error: any) {
        console.error('[Summary API] Error:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

// --- Angel One Order Postback (Webhook) Endpoint ---
app.post('/api/webhooks/angelone', async (req, res) => {
    try {
        const orderUpdate = req.body;
        const clientCode = orderUpdate.clientcode;

        console.log(`[Webhook] Received order update for ${clientCode}: Status=${orderUpdate.status}, ID=${orderUpdate.orderid}`);

        // 1. Core Logic: Check for Copy Trading (External order from Master)
        // We only replicate if:
        // - It's a "NEW" or "OPEN" status (initial placement)
        // - It's NOT from our own app (to avoid loops)
        // - The client is a Master in any group
        if (orderUpdate.status === 'ordered' || orderUpdate.status === 'open' || orderUpdate.orderstatus === 'SUBMITTED') {
            // Check if this order was placed by our app
            const { data: existingOrder } = await supabase
                .from('order_history')
                .select('id, source')
                .eq('broker_order_id', orderUpdate.orderid)
                .single();

            if (!existingOrder || existingOrder.source !== 'app') {
                // Potential Master order from external source (e.g., Angel One App)
                const { data: masterAccount } = await supabase
                    .from('demat_accounts')
                    .select('id')
                    .eq('client_id', clientCode)
                    .single();

                if (masterAccount) {
                    // Trigger replication logic (async)
                    replicateMasterOrder(masterAccount.id, orderUpdate).catch(err => {
                        console.error(`[Webhook] Copy trading replication failed for ${clientCode}:`, err.message);
                    });
                }
            }
        }

        // 2. Existing Logic: Route update to UI via Socket.io
        const userId = clientCodeToUser.get(clientCode);
        if (userId) {
            console.log(`[Webhook] Routing update to user ${userId}`);
            io.to(userId).emit('order_update', {
                symbol: orderUpdate.tradingsymbol,
                status: orderUpdate.status,
                orderstatus: orderUpdate.orderstatus,
                orderid: orderUpdate.orderid,
                type: orderUpdate.transactiontype,
                quantity: orderUpdate.quantity,
                avgPrice: orderUpdate.averageprice,
                filled: orderUpdate.filledshares,
                text: orderUpdate.text || ''
            });
        }

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[Webhook] Error:', error.message);
        res.status(500).send('Internal Error');
    }
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Sync/Load instruments on startup
    loadInstruments();
});
