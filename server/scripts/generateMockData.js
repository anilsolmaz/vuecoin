const fs = require('fs');
const path = require('path');

const framesCount = 200;
const frames = [];

const usdtTryBase = 35.5;

// Required explicit base coins
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
    sevilla: { priceUsd: 1.2 },
    jup: { priceUsd: 0.95 },
    fet: { priceUsd: 2.1 }
};

// Automap coins natively from assets directory
const iconPath = path.join(__dirname, '../../client/src/assets/coins');
let validIcons = [];
try {
    const allIcons = fs.readdirSync(iconPath);
    validIcons = allIcons.map(f => f.replace(/\.png$/i, '')).filter(x => !['noimage', 'undefined', 'try'].includes(x));
} catch(e) {
    console.error("Could not read coin icons, fallback empty array", e);
}

// Add native icons to list until hitting ~200
for (const icon of validIcons) {
    if (!baseCoins[icon] && Object.keys(baseCoins).length < 200) {
        baseCoins[icon] = { priceUsd: +(Math.random() * 50 + 0.05).toFixed(4) };
    }
}

// In case icons directory failed to provide 200, pad rest with popular names
const fallback = ["LTC", "BCH", "UNI", "ICP", "APT", "XLM", "HBAR", "CRO", "VET", "QNT", "MKR", "AAVE", "OP", "SNX", "GRT", "RNDR", "EGLD", "STX", "THETA", "EOS", "IMX", "XTZ", "MANA", "AXS", "SAND", "CRV", "MINA", "NEO", "KAVA", "GALA", "CHZ", "IOTA", "KLAY", "FLOW", "ZIL", "CAKE", "CFX", "XEC", "GMX", "DYDX", "SUI", "SEI", "TIA", "PYTH", "RON", "AGIX", "ORDI", "1INCH"];
for(const ticker of fallback) {
    const sym = ticker.toLowerCase();
    if (!baseCoins[sym] && Object.keys(baseCoins).length < 200) {
        baseCoins[sym] = { priceUsd: +(Math.random() * 50 + 0.05).toFixed(4) };
    }
}

let currentState = {};
for (const [coin, data] of Object.entries(baseCoins)) {
    currentState[coin] = {
        priceUsd: data.priceUsd,
        paribuPremium: Math.random() * 0.01 // 0 to +1% premium on paribu initially
    };
}

// Utility to nicely format decimal lengths across different scales
function roundPrice(val) {
    if (val > 100) return +(val.toFixed(2));
    if (val > 1) return +(val.toFixed(4));
    if (val > 0.001) return +(val.toFixed(6));
    return +(val.toFixed(8));
}

for (let i = 0; i < framesCount; i++) {
    const frame = {};
    
    // update usdt try first
    currentState.usdt.priceUsd = 1; 
    currentState.usdt.paribuPremium += (Math.random() - 0.5) * 0.001; 
    
    // Limit decimal precision on USDT to 4 decimals effectively solving the massive float issue
    const currentUsdtTry = roundPrice(usdtTryBase * (1 + currentState.usdt.paribuPremium));

    frame.usdt = {
        ROI: 0,
        binance: { 
            try: { price: usdtTryBase }, 
            usdt: { price: 1, bid: 0.9999, ask: 1.0001 } 
        },
        paribu: { 
            try: { price: currentUsdtTry, bid: roundPrice(currentUsdtTry * 0.999), ask: roundPrice(currentUsdtTry * 1.001) }, 
            usdt: { price: 1, bid: 0.9999, ask: 1.0001 } 
        }
    };

    for (const coin of Object.keys(baseCoins)) {
        if (coin === 'usdt') continue;

        // random walk for priceUsd between -0.4% and +0.4%
        currentState[coin].priceUsd *= (1 + (Math.random() - 0.5) * 0.008);
        currentState[coin].paribuPremium += (Math.random() - 0.5) * 0.002;
        
        if (i >= 30 && i <= 45 && coin === 'doge') currentState[coin].paribuPremium = 0.08; 
        if (i >= 60 && i <= 75 && coin === 'pepe') currentState[coin].paribuPremium = -0.02; 
        if (i >= 10 && i <= 90 && coin === 'sevilla') currentState[coin].paribuPremium = 0.035; 

        const binanceUsdtPrice = currentState[coin].priceUsd;
        const bUsdtPrice = roundPrice(binanceUsdtPrice);

        frame[coin] = {
            ROI: +(Math.random() * 2).toFixed(2), // Baseline random low ROI
            binance: {
                usdt: { 
                    price: bUsdtPrice, 
                    bid: roundPrice(bUsdtPrice * 0.999), 
                    ask: roundPrice(bUsdtPrice * 1.001),
                    volume: +(Math.random() * 1000000).toFixed(2) 
                }
            }
        };

        // UI natively parses 'paribu', 'binance', and 'BTCTurk' EXACTLY. (Case sensitive).
        const activeExchanges = ['paribu'];
        if (Math.random() > 0.4) activeExchanges.push('BTCTurk');

        // Always ensure some coins have full spread across both Turkish exchanges
        if (['btc', 'eth', 'usdt', 'doge', 'pepe', 'sevilla', 'jup', 'chz'].includes(coin)) {
            if (!activeExchanges.includes('BTCTurk')) activeExchanges.push('BTCTurk');
        }

        // Generate deal attributes for the assigned exchanges
        activeExchanges.forEach(exch => {
            const exchPremium = currentState[coin].paribuPremium + (Math.random() - 0.5) * 0.005;
            let exchUsdtPrice = binanceUsdtPrice * (1 + exchPremium);
            let exchTryPrice = exchUsdtPrice * currentUsdtTry;
            
            const pUsdtPrice = roundPrice(exchUsdtPrice);
            const pTryPrice = roundPrice(exchTryPrice);
            
            frame[coin][exch] = {
                usdt: { 
                    price: pUsdtPrice, 
                    bid: roundPrice(pUsdtPrice * 0.9985), 
                    ask: roundPrice(pUsdtPrice * 1.0015),
                    volume: +(Math.random() * 50000).toFixed(2) 
                },
                try: { 
                    price: pTryPrice, 
                    bid: roundPrice(pTryPrice * 0.9985), 
                    ask: roundPrice(pTryPrice * 1.0015),
                    volume: +(Math.random() * 500000).toFixed(2) 
                }
            };
        });

        // The dashboard selects top deals utilizing explicit .ROI value directly out of the frame.
        // If it's a huge premium artificially set, override the ROI explicitly so it rockets to the top.
        if (currentState[coin].paribuPremium > 0.02) {
             frame[coin].ROI = +(currentState[coin].paribuPremium * 100).toFixed(2);
        }
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
console.log(`Mock data generated successfully for ${Object.keys(baseCoins).length} coins at ${outPath}`);
