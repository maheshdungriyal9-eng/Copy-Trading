import axios from 'axios';

export interface OrderParams {
    variety: 'NORMAL' | 'STOPLOSS' | 'ROBO';
    tradingsymbol: string;
    symboltoken: string;
    transactiontype: 'BUY' | 'SELL';
    exchange: 'NSE' | 'BSE' | 'NFO' | 'MCX' | 'BFO' | 'CDS';
    ordertype: 'MARKET' | 'LIMIT' | 'STOPLOSS_LIMIT' | 'STOPLOSS_MARKET';
    producttype: 'DELIVERY' | 'CARRYFORWARD' | 'MARGIN' | 'INTRADAY' | 'BO';
    duration: 'DAY' | 'IOC';
    price: string;
    squareoff?: string;
    stoploss?: string;
    quantity: string;
    disclosedquantity?: string;
    triggerprice?: string;
    trailingStopLoss?: string;
    scripconsent?: string;
}

export interface GTTParams {
    tradingsymbol: string;
    symboltoken: string;
    exchange: 'NSE' | 'BSE';
    transactiontype: 'BUY' | 'SELL';
    producttype: 'DELIVERY' | 'MARGIN';
    price: string;
    qty: string;
    triggerprice: string;
    disclosedqty: string;
}

const BASE_URL = 'https://apiconnect.angelone.in';

const getHeaders = (accessToken: string, apiKey: string) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '127.0.0.1',
    'X-MACAddress': '00-00-00-00-00-00',
    'X-PrivateKey': apiKey
});

export const placeOrder = async (accessToken: string, apiKey: string, params: OrderParams) => {
    try {
        const response = await axios.post(`${BASE_URL}/rest/secure/angelbroking/order/v1/placeOrder`, params, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Place Order Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const createGTTRule = async (accessToken: string, apiKey: string, params: GTTParams) => {
    try {
        const response = await axios.post(`${BASE_URL}/rest/secure/angelbroking/gtt/v1/createRule`, params, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Create GTT Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getOrderBook = async (accessToken: string, apiKey: string) => {
    try {
        const response = await axios.get(`${BASE_URL}/rest/secure/angelbroking/order/v1/getOrderBook`, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get Order Book Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getGTTRuleList = async (accessToken: string, apiKey: string) => {
    try {
        const params = {
            status: ["NEW", "CANCELLED", "ACTIVE", "SENTTOEXCHANGE", "FORALL"],
            page: 1,
            count: 50
        };
        const response = await axios.post(`${BASE_URL}/rest/secure/angelbroking/gtt/v1/ruleList`, params, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get GTT Rule List Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const cancelOrder = async (accessToken: string, apiKey: string, orderid: string, variety: string = 'NORMAL') => {
    try {
        const response = await axios.post(`${BASE_URL}/rest/secure/angelbroking/order/v1/cancelOrder`, { orderid, variety }, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Cancel Order Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const cancelGTTRule = async (accessToken: string, apiKey: string, id: string, symboltoken: string, exchange: string) => {
    try {
        const response = await axios.post(`${BASE_URL}/rest/secure/angelbroking/gtt/v1/cancelRule`, { id, symboltoken, exchange }, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Cancel GTT Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};
export const getTradeBook = async (accessToken: string, apiKey: string) => {
    try {
        const response = await axios.get(`${BASE_URL}/rest/secure/angelbroking/order/v1/getTradeBook`, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get Trade Book Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getOrderDetails = async (accessToken: string, apiKey: string, uniqueorderid: string) => {
    try {
        const response = await axios.get(`${BASE_URL}/rest/secure/angelbroking/order/v1/details/${uniqueorderid}`, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get Order Details Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getLtpData = async (accessToken: string, apiKey: string, params: { exchange: string, tradingsymbol: string, symboltoken: string }) => {
    try {
        const response = await axios.post(`${BASE_URL}/rest/secure/angelbroking/order/v1/getLtpData`, params, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get LTP Data Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};
export const getRMS = async (accessToken: string, apiKey: string) => {
    try {
        const response = await axios.get(`${BASE_URL}/rest/secure/angelbroking/user/v1/getRMS`, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get RMS Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getPositions = async (accessToken: string, apiKey: string) => {
    try {
        const response = await axios.get(`${BASE_URL}/rest/secure/angelbroking/order/v1/getPosition`, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get Positions Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getHoldings = async (accessToken: string, apiKey: string) => {
    try {
        const response = await axios.get(`${BASE_URL}/rest/secure/angelbroking/portfolio/v1/getHolding`, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get Holdings Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getAllHoldings = async (accessToken: string, apiKey: string) => {
    try {
        const response = await axios.get(`${BASE_URL}/rest/secure/angelbroking/portfolio/v1/getAllHolding`, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Get All Holdings Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const convertPosition = async (accessToken: string, apiKey: string, params: any) => {
    try {
        const response = await axios.post(`${BASE_URL}/rest/secure/angelbroking/order/v1/convertPosition`, params, {
            headers: getHeaders(accessToken, apiKey)
        });
        return response.data;
    } catch (error: any) {
        console.error('[AngelOneOrders] Convert Position Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};
