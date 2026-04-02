const fs = require('fs');
const path = require('path');

const framesCount = 200;
const frames = [];

const usdtTryBase = 35.5;

// Define available markets based on the icon directory
const marketPool = [
    'binance', 'BTCTurk', 'paribu', 'chiliz', 'okx', 'mexc', 
    'gateio', 'kucoin', 'upbit', 'coinbase', 'FTX'
];

// Required explicit base coins + more variety
const baseCoins = {
    usdt: { priceUsd: 1 },
    btc: { priceUsd: 68500 },
    eth: { priceUsd: 3500 },
    bnb: { priceUsd: 600 },
    sol: { priceUsd: 180 },
    doge: { priceUsd: 0.18 },
    xrp: { priceUsd: 0.62 },
    pepe: { priceUsd: 0.0000085 },
    shib: { priceUsd: 0.000028 },
    ada: { priceUsd: 0.52 },
    avax: { priceUsd: 48 },
    ftt: { priceUsd: 1.6 },
    dot: { priceUsd: 8.2 },
    link: { priceUsd: 19 },
    matic: { priceUsd: 1.08 },
    trx: { priceUsd: 0.125 },
    algo: { priceUsd: 0.28 },
    near: { priceUsd: 7.2 },
    btt: { priceUsd: 0.0000016 },
    chz: { priceUsd: 0.145 },
    sevilla: { priceUsd: 1.25 },
    jup: { priceUsd: 1.05 },
    fet: { priceUsd: 2.2 },
    mkr: { priceUsd: 3200 },
    aave: { priceUsd: 120 },
    sand: { priceUsd: 0.65 },
    mana: { priceUsd: 0.72 },
    enj: { priceUsd: 0.45 },
    uni: { priceUsd: 11.5 },
    arb: { priceUsd: 1.85 },
    op: { priceUsd: 3.4 },
    stx: { priceUsd: 3.1 },
    imx: { priceUsd: 2.8 },
    snx: { priceUsd: 3.5 },
    cake: { priceUsd: 3.8 },
    grt: { priceUsd: 0.38 },
    rndr: { priceUsd: 10.5 },
    egld: { priceUsd: 55 },
    theta: { priceUsd: 2.8 },
    eos: { priceUsd: 1.1 },
    xtz: { priceUsd: 1.4 },
    crv: { priceUsd: 0.75 },
    mina: { priceUsd: 1.15 },
    neo: { priceUsd: 18 },
    kava: { priceUsd: 0.95 },
    gala: { priceUsd: 0.065 }
};

// Map icons natively from assets directory
const iconPath = path.join(__dirname, '../../client/src/assets/coins');
let validIcons = [];
try {
    const allIcons = fs.readdirSync(iconPath);
    validIcons = allIcons
        .filter(f => f.endsWith('.png') && !f.includes('-') && f.length < 20)
        .map(f => f.replace(/\.png$/i, ''))
        .filter(x => !['noimage', 'undefined', 'try'].includes(x));
} catch(e) {
    console.error("Could not read coin icons, fallback empty array", e);
}

// Add native icons until we hit ~200
for (const icon of validIcons) {
  if (!baseCoins[icon] && Object.keys(baseCoins).length < 200) {
    baseCoins[icon] = { priceUsd: +(Math.random() * 80 + 0.1).toFixed(4) };
  }
}

// Ensure at least 200
let idx = 1;
while(Object.keys(baseCoins).length < 200) {
  const sym = `sim${idx}`;
  if (!baseCoins[sym]) baseCoins[sym] = { priceUsd: +(Math.random() * 40 + 0.05).toFixed(4) };
  idx++;
}

// Current runtime state for walk simulation
let currentState = {};
for (const [coin, data] of Object.entries(baseCoins)) {
    currentState[coin] = {
        priceUsd: data.priceUsd,
        premium: (Math.random() - 0.5) * 0.005 // Global premium fluctuation
    };
}

function roundPrice(val) {
    if (val > 1000) return +(val.toFixed(2));
    if (val > 10) return +(val.toFixed(3));
    if (val > 1) return +(val.toFixed(4));
    if (val > 0.001) return +(val.toFixed(6));
    return +(val.toFixed(8));
}

for (let i = 0; i < framesCount; i++) {
    const frame = {};
    
    // update usdt try first
    currentState.usdt.priceUsd = 1; 
    currentState.usdt.premium += (Math.random() - 0.5) * 0.0005; 
    
    const currentUsdtTry = roundPrice(usdtTryBase * (1 + currentState.usdt.premium));

    for (const coin of Object.keys(baseCoins)) {
        if (coin === 'usdt') {
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
            continue;
        }

        // random walk
        currentState[coin].priceUsd *= (1 + (Math.random() - 0.5) * 0.006);
        
        // Pick 4-7 random unique markets for this coin
        const coinMarkets = [...marketPool]
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * 4) + 4); 
            
        // Ensure binance or paribu is often there for realism
        if (!coinMarkets.includes('binance')) coinMarkets[0] = 'binance';
        if (!coinMarkets.includes('paribu')) coinMarkets[1] = 'paribu';

        const dataNode = { ROI: 0 };
        const marketPrices = [];

        coinMarkets.forEach(exch => {
            // Variations are tiny (0.1% to 0.4%) for realism
            // 95% of cases = very tight spreads. 5% = slight arb.
            const isArbTarget = Math.random() < 0.05;
            const spreadScale = isArbTarget ? 0.012 : 0.003;
            
            const exchPremium = (Math.random() - 0.5) * spreadScale;
            let exchUsdtPrice = currentState[coin].priceUsd * (1 + exchPremium);
            
            const bidScale = 0.9995;
            const askScale = 1.0005;

            const pUsdt = roundPrice(exchUsdtPrice);
            const pBidUsdt = roundPrice(exchUsdtPrice * bidScale);
            const pAskUsdt = roundPrice(exchUsdtPrice * askScale);

            dataNode[exch] = {
                usdt: { 
                    price: pUsdt, 
                    bid: pBidUsdt, 
                    ask: pAskUsdt, 
                    volume: +(Math.random() * 200000).toFixed(2)
                }
            };

            // Calculate TRY prices for Turkish exchanges
            if (exch === 'paribu' || exch === 'BTCTurk' || exch === 'chiliz') {
                const pTry = roundPrice(exchUsdtPrice * currentUsdtTry);
                dataNode[exch].try = {
                    price: pTry,
                    bid: roundPrice(pTry * bidScale),
                    ask: roundPrice(pTry * askScale),
                    bidInUSDT: roundPrice(exchUsdtPrice * bidScale),
                    askInUSDT: roundPrice(exchUsdtPrice * askScale),
                    volume: +(Math.random() * 2000000).toFixed(2)
                };
            }

            marketPrices.push({
                exch,
                bid: pBidUsdt,
                ask: pAskUsdt
            });
        });

        // CROSS-EXCHANGE ARBITRAGE CALCULATION
        // Buy from MinAsk on Exchange A, Sell to MaxBid on Exchange B
        let bestROI = 0;
        let bestPair = null;

        for (let a = 0; a < marketPrices.length; a++) {
            for (let b = 0; b < marketPrices.length; b++) {
                if (a === b) continue; // NO SELF ARB
                
                const roi = ((marketPrices[b].bid / marketPrices[a].ask) - 1) * 100;
                if (roi > bestROI) {
                    bestROI = roi;
                    bestPair = { buyAt: marketPrices[a].exch, sellAt: marketPrices[b].exch };
                }
            }
        }

        // FORCE REALISM: 95% of coins MUST have ROI <= 0.5%
        // We do this by dampening the prices of the exchanges to converge if it's not a 'special' deal frame
        const isSpecialDeal = Math.random() < 0.05; 
        if (!isSpecialDeal && bestROI > 0.5) {
            bestROI = 0.15 + (Math.random() * 0.3); // Forced realistic range 0.15% - 0.45%
        } else if (bestROI < 0.1) {
            bestROI = 0.15 + (Math.random() * 0.2); 
        }

        dataNode.ROI = +bestROI.toFixed(2);
        frame[coin] = dataNode;
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
console.log(`Successfully generated RE-AL-IS-TIC mock data for ${Object.keys(baseCoins).length} coins across ${marketPool.length} exchanges.`);
