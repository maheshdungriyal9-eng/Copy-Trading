import axios from 'axios';
import fs from 'fs';
import path from 'path';

const INSTRUMENTS_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';
const DATA_DIR = path.join(__dirname, '../../data');
const INSTRUMENTS_FILE = path.join(DATA_DIR, 'instruments.json');

export interface Instrument {
    token: string;
    symbol: string;
    name: string;
    expiry: string;
    strike: string;
    lotsize: string;
    instrumenttype: string;
    exch_seg: string;
    tick_size: string;
}

let cachedInstruments: Instrument[] = [];

export const syncInstruments = async () => {
    try {
        console.log('Fetching Angel One instruments list from:', INSTRUMENTS_URL);
        if (!fs.existsSync(DATA_DIR)) {
            console.log('Creating data directory:', DATA_DIR);
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const response = await axios.get(INSTRUMENTS_URL, {
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        const data = response.data;
        console.log('Response received. Data type:', typeof data, 'Is array:', Array.isArray(data));

        if (Array.isArray(data)) {
            console.log(`Writing ${data.length} instruments to:`, INSTRUMENTS_FILE);
            fs.writeFileSync(INSTRUMENTS_FILE, JSON.stringify(data));
            cachedInstruments = data;
            console.log(`Successfully synced ${data.length} instruments.`);
        }
    } catch (error: any) {
        console.error('Failed to sync instruments:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
    }
};

export const loadInstruments = () => {
    try {
        if (fs.existsSync(INSTRUMENTS_FILE)) {
            const data = fs.readFileSync(INSTRUMENTS_FILE, 'utf-8');
            cachedInstruments = JSON.parse(data);
            console.log(`Loaded ${cachedInstruments.length} instruments from cache.`);
        } else {
            syncInstruments();
        }
    } catch (error) {
        console.error('Failed to load instruments:', error);
    }
};

export const searchInstruments = (query: string, limit = 10) => {
    if (!query || query.length < 2) return [];

    const searchStr = query.toUpperCase();
    return cachedInstruments
        .filter(inst =>
            inst.symbol.toUpperCase().includes(searchStr) ||
            inst.name.toUpperCase().includes(searchStr)
        )
        .slice(0, limit);
};

export const searchScripAPI = async (exchange: string, query: string, apiKey: string, accessToken: string) => {
    try {
        const response = await axios.post(
            'https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/searchScrip',
            {
                exchange: exchange,
                searchscrip: query
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-ClientLocalIP': process.env.CLIENT_PUBLIC_IP || '127.0.0.1',
                    'X-ClientPublicIP': process.env.CLIENT_PUBLIC_IP || '127.0.0.1',
                    'X-MACAddress': '00-00-00-00-00-00',
                    'X-PrivateKey': apiKey,
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (response.data && response.data.status) {
            return response.data.data;
        }
        return [];
    } catch (error: any) {
        console.error('Scrip search API failed:', error.message);
        return [];
    }
};
