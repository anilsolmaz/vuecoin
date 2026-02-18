const axios = require('axios');

async function debugFlow() {
    console.log('🔍 Debugging FLOW Coin Data & ROI...\n');

    try {
        // 1. Fetch Paribu Data (for USDT rate)
        console.log('Fetching Paribu Data...');
        const paribuRes = await axios.get('https://www.paribu.com/ticker');
        const paribuData = paribuRes.data;

        // DEBUG: Print first 5 keys to see structure
        console.log('Paribu Keys:', Object.keys(paribuData).slice(0, 5));

        let paribuUSDT = paribuData['usdt_tl'];
        // Try uppercase if lowercase fails
        if (!paribuUSDT) paribuUSDT = paribuData['USDT_TL'];

        const paribuFlow = paribuData['flow_tl'] || paribuData['FLOW_TL'];

        console.log('--- Paribu Data ---');
        console.log('USDT_TL:', paribuUSDT ? paribuUSDT.last : 'NOT FOUND');
        console.log('FLOW_TL:', paribuFlow ? paribuFlow.last : 'NOT FOUND');

        const usdtRate = paribuUSDT ? parseFloat(paribuUSDT.last) : 0;
        console.log(`ℹ️  Using Paribu USDT Rate: ${usdtRate} TRY\n`);


        // 2. Fetch Binance Data
        console.log('Fetching Binance Data...');
        const binanceRes = await axios.get('https://api.binance.com/api/v3/ticker/bookTicker');
        const binanceData = binanceRes.data;
        const binanceFlowUSDT = binanceData.find(x => x.symbol === 'FLOWUSDT');

        console.log('--- Binance Data ---');
        if (binanceFlowUSDT) {
            console.log('FLOWUSDT:', binanceFlowUSDT);
            console.log(`Converted to TRY (Ask): ${(parseFloat(binanceFlowUSDT.askPrice) * usdtRate).toFixed(4)}`);
            console.log(`Converted to TRY (Bid): ${(parseFloat(binanceFlowUSDT.bidPrice) * usdtRate).toFixed(4)}`);
        } else {
            console.log('FLOWUSDT: NOT FOUND');
        }
        console.log('');


        // 3. Fetch BTCTurk Data
        console.log('Fetching BTCTurk Data...');
        const btcturkRes = await axios.get('https://api.btcturk.com/api/v2/ticker');
        const btcturkData = btcturkRes.data.data;

        const btcFlowTRY = btcturkData.find(x => x.pair === 'FLOWTRY');
        const btcFlowUSDT = btcturkData.find(x => x.pair === 'FLOWUSDT');
        const btcUSDTTRY = btcturkData.find(x => x.pair === 'USDTTRY');

        console.log('--- BTCTurk Data ---');

        if (btcUSDTTRY) {
            console.log('USDTTRY (Native):', {
                last: btcUSDTTRY.last,
                bid: btcUSDTTRY.bid,
                ask: btcUSDTTRY.ask
            });
        }

        if (btcFlowTRY) {
            console.log('FLOWTRY (Ticker):', {
                last: btcFlowTRY.last,
                bid: btcFlowTRY.bid,
                ask: btcFlowTRY.ask
            });

            // 4. Fetch Orderbook comparisons
            console.log('\nFetching BTCTurk Orderbook for FLOWTRY...');
            try {
                const orderbookRes = await axios.get('https://api.btcturk.com/api/v2/orderbook?pairSymbol=FLOWTRY');
                const orderbook = orderbookRes.data.data;
                const bestBid = orderbook.bids[0]; // [price, amount]
                const bestAsk = orderbook.asks[0];

                console.log('FLOWTRY (Orderbook):', {
                    bestBid: bestBid ? bestBid[0] : 'NONE',
                    bestAsk: bestAsk ? bestAsk[0] : 'NONE'
                });

                if (parseFloat(btcFlowTRY.bid) !== parseFloat(bestBid[0])) {
                    console.error('⚠️  MISMATCH: Ticker Bid != Orderbook Bid');
                } else {
                    console.log('✅  Ticker and Orderbook match.');
                }
            } catch (e) {
                console.error('Failed to fetch orderbook:', e.message);
            }

        } else {
            console.log('FLOWTRY: NOT FOUND');
        }

        if (btcFlowUSDT) {
            console.log('FLOWUSDT:', {
                last: btcFlowUSDT.last,
                bid: btcFlowUSDT.bid,
                ask: btcFlowUSDT.ask
            });
            // Simulate conversion using Paribu Rate
            const convertedBid = parseFloat(btcFlowUSDT.bid) * usdtRate;
            const convertedAsk = parseFloat(btcFlowUSDT.ask) * usdtRate;

            console.log(`\n⚠️  Simulated Conversion (using Paribu USDT: ${usdtRate})`);
            console.log(`FLOWUSDT Bid (Sell possibility): ${convertedBid.toFixed(4)} TRY`);
            console.log(`FLOWUSDT Ask (Buy possibility):  ${convertedAsk.toFixed(4)} TRY`);

            // ROI Calculation Trace
            // Assuming we buy at Binance/Paribu and sell at BTCTurk
            // OR buy at BTCTurk TRY and sell at BTCTurk USDT (Arbitrage within exchange?)
            // Let's look for the highest BID (Sell Price) across all options.

            console.log('\n--- ROI Analysis ---');
            console.log(`If you see specific incorrect ROI, check if one of these Bids is the "High Bid" used:`);
            if (binanceFlowUSDT) console.log(`Binance USDT Bid -> TRY: ${(parseFloat(binanceFlowUSDT.bidPrice) * usdtRate).toFixed(4)}`);
            if (btcFlowTRY) console.log(`BTCTurk TRY Bid:       ${btcFlowTRY.bid}`);
            console.log(`BTCTurk USDT Bid -> TRY: ${convertedBid.toFixed(4)}  <-- Is this the phantom price?`);

        } else {
            console.log('FLOWUSDT: NOT FOUND');
        }

    } catch (e) {
        console.error('❌ Error fetching data:', e.message);
    }
}

debugFlow();
