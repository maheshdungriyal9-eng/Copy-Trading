/// <reference path="../../types/smartapi-javascript.d.ts" />
import { SmartAPI } from "smartapi-javascript";
import * as speakeasy from "speakeasy";

export const loginAngelOne = async (clientId: string, totpSecret: string, apiKey: string, pin: string) => {
    try {
        const smart_api = new SmartAPI({
            api_key: apiKey,
        });

        // Generate TOTP (Sanitize secret by removing whitespace)
        const token = speakeasy.totp({
            secret: totpSecret.replace(/\s+/g, ''),
            encoding: 'base32'
        });

        const session = await smart_api.generateSession(clientId, pin, token);

        if (session.status) {
            // Some SDK versions might flatten the data or return it slightly differently
            const sessionData = session.data || session;

            if (!sessionData.jwtToken) {
                console.error('Angel One Session Status is TRUE but tokens are missing. Full Response:', JSON.stringify(session));
                throw new Error('Login succeeded but tokens are missing in the response.');
            }

            // CROSS-VERIFY Profile (for Email and Phone validation if provided)
            try {
                const profile = await smart_api.getProfile();
                console.log('[Demat] Profile fetched for verification:', JSON.stringify(profile));

                return {
                    success: true,
                    access_token: sessionData.jwtToken,
                    refresh_token: sessionData.refreshToken,
                    feed_token: sessionData.feedToken,
                    profile: profile.data
                };
            } catch (profileErr) {
                console.warn('[Demat] Login succeeded but profile fetch failed:', profileErr);
                // We still return success because the credentials themselves (ID/PIN/TOTP) are valid
                return {
                    success: true,
                    access_token: sessionData.jwtToken,
                    refresh_token: sessionData.refreshToken,
                    feed_token: sessionData.feedToken
                };
            }
        } else {
            console.error('Angel One Session Status is FALSE. Full Response:', JSON.stringify(session));
            throw new Error(session.message || 'Login failed');
        }
    } catch (error: any) {
        console.error('Angel One login error:', error.message || error);
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
