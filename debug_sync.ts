import axios from 'axios';
import fs from 'fs';
import path from 'path';

const INSTRUMENTS_URL = 'https://margincalculator.angelbroking.com/OpenAPI_Standard/v1/AssetOpenAPIScriptMaster.json';
const DATA_DIR = path.resolve(__dirname, './server/data');
const INSTRUMENTS_FILE = path.join(DATA_DIR, 'instruments.json');

async function testSync() {
    try {
        console.log('Fetching Angel One instruments list...');
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const response = await axios.get(INSTRUMENTS_URL);
        console.log('Response received, status:', response.status);
        const data = response.data;

        if (Array.isArray(data)) {
            console.log(`Writing ${data.length} instruments to file...`);
            fs.writeFileSync(INSTRUMENTS_FILE, JSON.stringify(data));
            console.log('Successfully written to', INSTRUMENTS_FILE);
        } else {
            console.log('Data is not an array:', typeof data);
        }
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

testSync();
