const axios = require('axios');

async function check() {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.paribu.com/'
    };

    console.log('--- Probing Paribu ---');

    // 1. Markets detail
    try {
        console.log('Attempt 1: /app/markets/btc-tl');
        const r1 = await axios.get('https://v3.paribu.com/app/markets/btc-tl', { headers });
        console.log('Status:', r1.status);
        if (r1.data.payload) {
            console.log('Payload keys:', Object.keys(r1.data.payload));
            if (r1.data.payload.orderBook) console.log('OrderBook Found!');
        }
    } catch (e) { console.log('Error 1:', e.message); }

    // 2. Ticker (Re-check)
    try {
        console.log('\nAttempt 2: /ticker');
        const r2 = await axios.get('https://www.paribu.com/ticker', { headers });
        // console.log('Keys:', Object.keys(r2.data));
    } catch (e) { console.log('Error 2:', e.message); }

}

check();
