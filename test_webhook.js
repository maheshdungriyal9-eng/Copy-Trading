
const axios = require('axios');

async function testWebhook() {
    const webhookUrl = 'http://localhost:5000/api/webhooks/angelone';

    // Mock Angel One Order Update payload
    const mockPayload = {
        clientcode: 'M123456', // Replace with a real Master client code for manual testing
        status: 'ordered',
        tradingsymbol: 'RELIANCE-EQ',
        symboltoken: '2885',
        exchange: 'NSE',
        transactiontype: 'BUY',
        ordertype: 'MARKET',
        producttype: 'INTRADAY',
        quantity: '10',
        orderid: 'TEST_ORDER_' + Date.now(),
        orderstatus: 'SUBMITTED'
    };

    try {
        console.log('Sending mock webhook payload...');
        const response = await axios.post(webhookUrl, mockPayload);
        console.log('Response:', response.statusCode || 200);
        console.log('Check server logs for [Webhook] and [CopyTrade] messages.');
    } catch (error) {
        console.error('Error sending webhook:', error.message);
    }
}

testWebhook();
