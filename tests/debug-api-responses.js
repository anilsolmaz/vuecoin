const axios = require('axios');

async function check() {
    try {
        // Paribu
        console.log('Checking Paribu...');
        const p = await axios.get('https://www.paribu.com/ticker');
        const pKeys = Object.keys(p.data);
        if (pKeys.length > 0) {
            console.log('Paribu Sample:', p.data[pKeys[0]]);
        }

        // Binance
        console.log('\nChecking Binance...');
        const b = await axios.get('https://api.binance.com/api/v3/ticker/bookTicker');
        if (b.data.length > 0) {
            console.log('Binance Sample:', b.data[0]);
        }

        // BTCTurk
        console.log('\nChecking BTCTurk...');
        const t = await axios.get('https://api.btcturk.com/api/v2/ticker');
        if (t.data.data.length > 0) {
            console.log('BTCTurk Sample:', t.data.data[0]);
        }

    } catch (e) {
        console.error(e.message);
    }
}

check();
