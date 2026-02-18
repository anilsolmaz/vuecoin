const axios = require('axios');

async function check() {
    try {
        // 1. BTCTurk
        console.log('--- BTCTurk Order Book ---');
        try {
            const btcTurk = await axios.get('https://api.btcturk.com/api/v2/orderbook?pairSymbol=BTCTRY');
            // Data structure usually: data.data.bids / asks
            const data = btcTurk.data.data;
            console.log('Bids (Top 1):', data.bids[0]);
            console.log('Asks (Top 1):', data.asks[0]);
        } catch (e) { console.log('BTCTurk Error:', e.message); }

        // 2. Binance
        console.log('\n--- Binance Order Book ---');
        try {
            const binance = await axios.get('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=5');
            // Data structure: bids / asks arrays
            console.log('Bids (Top 1):', binance.data.bids[0]);
            console.log('Asks (Top 1):', binance.data.asks[0]);
        } catch (e) { console.log('Binance Error:', e.message); }

        // 3. Paribu (Attempt 1)
        console.log('\n--- Paribu Order Book (Attempt 1) ---');
        try {
            const paribu1 = await axios.get('https://v3.paribu.com/app/markets/btc-tl/order-book', {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            console.log('Status:', paribu1.status);
            console.log('Data keys:', Object.keys(paribu1.data));
            if (paribu1.data.payload) {
                console.log('Payload keys:', Object.keys(paribu1.data.payload));
                if (paribu1.data.payload.bids) console.log('Bids (Top 1):', paribu1.data.payload.bids[0]);
            }
        } catch (e) { console.log('Paribu Attempt 1 Error:', e.message); }

    } catch (e) {
        console.error('General Error:', e.message);
    }
}

check();
