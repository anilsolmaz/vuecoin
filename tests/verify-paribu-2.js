const axios = require('axios');

async function check() {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.paribu.com/'
    };

    console.log('--- Probing Paribu Round 2 ---');

    // 1. initials/config
    try {
        console.log('Attempt 1: https://web.paribu.com/initials/config');
        const r1 = await axios.get('https://web.paribu.com/initials/config', { headers });
        console.log('Status:', r1.status);
        if (r1.data.payload) {
            console.log('Payload keys:', Object.keys(r1.data.payload));
            // Check if markets have orderBook
            const markets = r1.data.payload.markets;
            const firstKey = Object.keys(markets)[0];
            console.log('Market Sample:', markets[firstKey]);
        }
    } catch (e) { console.log('Error 1:', e.message); }

    // 2. app/initials
    try {
        console.log('\nAttempt 2: https://v3.paribu.com/app/initials');
        const r2 = await axios.get('https://v3.paribu.com/app/initials', { headers });
        console.log('Status:', r2.status);
        if (r2.data.payload) {
            console.log('Payload keys:', Object.keys(r2.data.payload));
        }
    } catch (e) { console.log('Error 2:', e.message); }

}

check();
