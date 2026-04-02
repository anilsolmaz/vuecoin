const fs = require('fs');

const framesCount = 100;
const frames = [];

const usdtTryBase = 35.5;

const baseCoins = {
    usdt: { priceUsd: 1 },
    btc: { priceUsd: 68500 },
    eth: { priceUsd: 3500 },
    bnb: { priceUsd: 600 },
    sol: { priceUsd: 180 },
    doge: { priceUsd: 0.15 },
    xrp: { priceUsd: 0.60 },
    pepe: { priceUsd: 0.000008 },
    shib: { priceUsd: 0.000028 },
    ada: { priceUsd: 0.50 },
    avax: { priceUsd: 45 },
    ftt: { priceUsd: 1.5 },
    dot: { priceUsd: 8 },
    link: { priceUsd: 18 },
    matic: { priceUsd: 1.05 },
    trx: { priceUsd: 0.12 },
    algo: { priceUsd: 0.25 },
    near: { priceUsd: 7 },
    btt: { priceUsd: 0.0000015 },
    chz: { priceUsd: 0.14 },
    sevilla: { priceUsd: 1.2 }
};

let currentState = {};
for (const [coin, data] of Object.entries(baseCoins)) {
    currentState[coin] = {
        priceUsd: data.priceUsd,
        paribuPremium: Math.random() * 0.01 // 0 to +1% premium on paribu initially
    };
}

for (let i = 0; i < framesCount; i++) {
    const frame = {};
    
    // update usdt try first
    currentState.usdt.priceUsd = 1; // usdt base is always 1 usdt
    currentState.usdt.paribuPremium += (Math.random() - 0.5) * 0.001; // try/usdt slight fluctuation
    const currentUsdtTry = usdtTryBase * (1 + currentState.usdt.paribuPremium);

    frame.usdt = {
        ROI: 0,
        binance: { try: { price: usdtTryBase }, usdt: { price: 1 } },
        paribu: { try: { price: currentUsdtTry }, usdt: { price: 1 } }
    };

    for (const coin of Object.keys(baseCoins)) {
        if (coin === 'usdt') continue;

        // random walk for priceUsd between -0.4% and +0.4%
        currentState[coin].priceUsd *= (1 + (Math.random() - 0.5) * 0.008);
        
        // random walk for paribu premium between -0.1% and +0.1%
        currentState[coin].paribuPremium += (Math.random() - 0.5) * 0.002;
        
        // Edge Cases - simulating pumps or ROI spikes
        
        // Massive ROI spike for Doge (frame 30 to 45) -> red danger alert in UI
        if (i >= 30 && i <= 45 && coin === 'doge') {
            currentState[coin].paribuPremium = 0.08; // 8% ROI
        }
        
        // Sudden drop below zero for Pepe (frame 60 to 75)
        if (i >= 60 && i <= 75 && coin === 'pepe') {
            currentState[coin].paribuPremium = -0.02; // -2% ROI
        }
        
        // High ROI for Sevilla
        if (i >= 10 && i <= 90 && coin === 'sevilla') {
            currentState[coin].paribuPremium = 0.035; // 3.5% ROI
        }

        const binanceUsdtPrice = currentState[coin].priceUsd;
        const paribuUsdtPrice = binanceUsdtPrice * (1 + currentState[coin].paribuPremium);
        const paribuTryPrice = paribuUsdtPrice * currentUsdtTry;

        const ROI = ((paribuUsdtPrice - binanceUsdtPrice) / binanceUsdtPrice) * 100;

        frame[coin] = {
            ROI: ROI,
            binance: {
                usdt: { price: binanceUsdtPrice, volume: Math.random() * 1000000 }
            },
            paribu: {
                usdt: { price: paribuUsdtPrice, volume: Math.random() * 50000 },
                try: { price: paribuTryPrice, volume: Math.random() * 500000 }
            }
        };
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

// Ensure path is correct relative to the script execution folder
const path = require('path');
const outPath = path.join(__dirname, '../../client/public/mockData.json');
fs.writeFileSync(outPath, JSON.stringify(mockDataObj, null, 2));
console.log('Mock data generated successfully at ' + outPath);
