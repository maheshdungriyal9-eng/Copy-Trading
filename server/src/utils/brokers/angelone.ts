/// <reference path="../../types/smartapi-javascript.d.ts" />
import { SmartAPI } from "smartapi-javascript";
import * as speakeasy from "speakeasy";

export const loginAngelOne = async (clientId: string, totpSecret: string, apiKey: string, pin: string) => {
    try {
        const smart_api = new SmartAPI({
            api_key: apiKey,
        });

        // Generate TOTP
        const token = speakeasy.totp({
            secret: totpSecret,
            encoding: 'base32'
        });

        const session = await smart_api.generateSession(clientId, pin, token);

        if (session.status) {
            return {
                success: true,
                access_token: session.data.jwtToken,
                refresh_token: session.data.refreshToken,
                feed_token: session.data.feedToken
            };
        } else {
            throw new Error(session.message || 'Login failed');
        }
    } catch (error) {
        console.error('Angel One login error:', error);
        throw error;
    }
};

export const placeAngelOneOrder = async (
    accessToken: string,
    apiKey: string,
    orderDetails: {
        symbol: string,
        exchange: string,
        tradingsymbol: string,
        symboltoken: string,
        transactiontype: 'BUY' | 'SELL',
        quantity: number,
        ordertype: 'MARKET' | 'LIMIT',
        producttype: 'DELIVERY' | 'CARRYFORWARD' | 'INTRADAY',
        price?: number
    }
) => {
    try {
        const smart_api = new SmartAPI({
            api_key: apiKey,
        });

        // Setup session
        // Note: SDK usually requires re-initializing or setting tokens
        // For stateless calls, we might need a custom wrapper or ensuring the SDK instance has the JWT

        const orderParams = {
            variety: "NORMAL",
            tradingsymbol: orderDetails.tradingsymbol,
            symboltoken: orderDetails.symboltoken,
            transactiontype: orderDetails.transactiontype,
            exchange: orderDetails.exchange,
            ordertype: orderDetails.ordertype,
            producttype: orderDetails.producttype,
            duration: "DAY",
            price: orderDetails.price?.toString() || "0",
            squareoff: "0",
            stoploss: "0",
            quantity: orderDetails.quantity.toString()
        };

        // This is a simplified call, in practice we'd use the SDK method
        // const response = await smart_api.placeOrder(orderParams);

        console.log(`Placing Angel One Order: ${JSON.stringify(orderParams)}`);
        return { success: true, orderid: 'MOCK-ANGEL-' + Date.now() };
    } catch (error) {
        console.error('Angel One order placement error:', error);
        throw error;
    }
};
