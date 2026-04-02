const fs = require('fs');
const path = require('path');

const framesCount = 200;
const frames = [];

const usdtTryBase = 35.5;

// All available markets from icons
const marketPool = [
    'binance', 'BTCTurk', 'paribu', 'chiliz', 'okx', 'mexc', 
    'gateio', 'kucoin', 'upbit', 'coinbase', 'FTX'
];

// Seed basic coins
const baseCoins = {};
const iconPath = path.join(__dirname, '../../client/src/assets/coins');
try {
    const allIcons = fs.readdirSync(iconPath);
    const validIcons = allIcons
        .filter(f => f.endsWith('.png') && !f.includes('-') && f.length < 20)
        .map(f => f.replace(/\.png$/i, ''))
        .filter(x => !['noimage', 'undefined', 'try'].includes(x));
    
    validIcons.forEach(icon => {
        baseCoins[icon] = { priceUsd: +(Math.random() * 50 + 0.1).toFixed(4) };
    });
} catch(e) { /* fallback if needed */ }

// Ensure 200 coins
let simIdx = 1;
while(Object.keys(baseCoins).length < 200) {
    baseCoins[`sim${simIdx++}`] = { priceUsd: +(Math.random() * 50).toFixed(4) };
}

// Current state for walk
let currentState = {};
for (const [coin, data] of Object.entries(baseCoins)) {
    currentState[coin] = { 
        priceUsd: data.priceUsd,
        volatility: 0.005 + Math.random() * 0.01
    };
}

function roundPrice(val) {
    if (val > 1000) return +(val.toFixed(2));
    if (val > 1) return +(val.toFixed(4));
    return +(val.toFixed(8));
}

for (let i = 0; i < framesCount; i++) {
    const frame = {};
    const usdtPremium = (Math.sin(i / 10) * 0.001);
    const currentUsdtTry = roundPrice(usdtTryBase * (1 + usdtPremium));

    for (const [coin, state] of Object.entries(baseCoins)) {
        if (coin === 'usdt') {
            frame.usdt = {
                ROI: 0,
                binance: { usdt: { price: 1, bid: 0.9999, ask: 1.0001 } },
                paribu: { try: { price: currentUsdtTry, bid: roundPrice(currentUsdtTry * 0.999), ask: roundPrice(currentUsdtTry * 1.001) } }
            };
            continue;
        }

        // Price random walk
        currentState[coin].priceUsd *= (1 + (Math.random() - 0.5) * currentState[coin].volatility);
        const refPrice = currentState[coin].priceUsd;

        // Assigning Behavioral Roles
        let forcedROI = null;
        if (coin === 'btc') {
            // Stable Deal: Always 0.45% - 0.65%
            forcedROI = 0.45 + (Math.sin(i / 5) * 0.1); 
        } else if (coin === 'eth') {
            // Volatile Deal: Oscillates between 0.1% and 1.8%
            forcedROI = 0.95 + (Math.sin(i / 8) * 0.85);
        } else if (coin === 'pepe') {
            // Whale Deal: Massive spike at specific frames
            if ((i >= 40 && i <= 55) || (i >= 140 && i <= 155)) {
                forcedROI = 12.5 + (Math.random() * 3);
            }
        }

        const coinNode = { ROI: 0 };
        const coinMarkets = [...marketPool].sort(() => 0.5 - Math.random()).slice(0, 5); 
        // Ensure some diversity
        if (!coinMarkets.includes('binance')) coinMarkets[0] = 'binance';
        if (!coinMarkets.includes('paribu')) coinMarkets[1] = 'paribu';

        const marketData = [];
        coinMarkets.forEach((exch, idx) => {
            // Baseline premium for this exchange
            let premium = (Math.random() - 0.5) * 0.004; // Very tight baseline
            
            // If this coin has a forced ROI, we adjust the first two exchanges to create that gap
            if (forcedROI !== null && idx === 0) {
                // Exchange 0 is the "Sell" (High)
                premium = (forcedROI / 100) / 2;
            } else if (forcedROI !== null && idx === 1) {
                // Exchange 1 is the "Buy" (Low)
                premium = -(forcedROI / 100) / 2;
            } else {
                // 95% Realism: Most coins have ROIs < 0.5
                // Force others to stay close to reference
                if (Math.random() > 0.05) {
                    premium = (Math.random() - 0.5) * 0.003; 
                }
            }

            const pUsdt = refPrice * (1 + premium);
            const pTry = pUsdt * currentUsdtTry;

            coinNode[exch] = {
                usdt: { 
                    price: roundPrice(pUsdt), 
                    bid: roundPrice(pUsdt * 0.9995), 
                    ask: roundPrice(pUsdt * 1.0005),
                    askInTRY: roundPrice(pUsdt * 1.0005 * currentUsdtTry),
                    bidInTRY: roundPrice(pUsdt * 0.9995 * currentUsdtTry)
                },
                try: { 
                    price: roundPrice(pTry), 
                    bid: roundPrice(pTry * 0.9995), 
                    ask: roundPrice(pTry * 1.0005) 
                }
            };

            marketData.push({ exch, bid: pUsdt * 0.9995, ask: pUsdt * 1.0005 });
        });

        // CALCULATE ACTUAL CROSS-EXCHANGE ROI
        let bestBid = 0;
        let bestAsk = Infinity;
        let bestBidExch = '';
        let bestAskExch = '';

        marketData.forEach(m => {
            if (m.bid > bestBid) { bestBid = m.bid; bestBidExch = m.exch; }
            if (m.ask < bestAsk) { bestAsk = m.ask; bestAskExch = m.exch; }
        });

        if (bestBidExch !== bestAskExch && bestBid > bestAsk) {
            coinNode.ROI = +(((bestBid / bestAsk) - 1) * 100).toFixed(2);
        } else {
            // Natural noise
            coinNode.ROI = +(Math.random() * 0.3).toFixed(2);
        }

        frame[coin] = coinNode;
    }
    frames.push(frame);
}

const mockDataObj = {
    recordedAt: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit'
    }),
    frames: frames
};

const outPath = path.join(__dirname, '../../client/public/mockData.json');
fs.writeFileSync(outPath, JSON.stringify(mockDataObj, null, 2));
console.log(`Mock data generated with behavioral actors: BTC (Stable), ETH (Volatile), PEPE (Whale).`);
