const CoinDataService = require('../server/services/CoinDataService');
const f = require('../server/js/functions');

// Mocking functions
f.getParibuOrderBook = async function (symbol) {
    console.log(`[Mock] Fetching Paribu OrderBook for ${symbol}`);
    return {
        timestamp: 123456789,
        bids: [
            ["100.0", "5.0"],
            ["99.0", "10.0"]
        ],
        asks: [
            ["105.0", "2.0"],
            ["106.0", "20.0"]
        ]
    };
};

async function verifyParibuLogic() {
    console.log('--- Verifying Paribu Volume Logic with Wait ---');

    // Setup Mock Coin
    const coin = "PARIBUTEST";
    CoinDataService.coinList[coin] = {
        paribu: { try: { price: 100, ask: 105, bid: 100 } },
        binance: { try: { price: 110, ask: 120, bid: 115, askQty: 50, bidQty: 50 } },
        BTCTurk: {}, chiliz: {}, FTX: {}
    };

    // Reset Cache
    CoinDataService.depthCache = {};

    console.log('1. First Calculation (No Depth Cache)...');
    CoinDataService.calculateCoinMetrics(coin);

    let item = CoinDataService.coinList[coin];

    // We expect NO arbitrage details because we are waiting for depth
    if (!item.arbitrageDetails) {
        console.log('✅ Correctly WAITING for depth data (No premature alert).');
    } else {
        console.error('❌ Failed. Generated alert prematurely without depth:', item.arbitrageDetails);
    }

    // 2. Mock Cache Population (Simulate fetch completion)
    console.log('2. Populating Cache...');
    await CoinDataService.fetchDepth(coin, 'Paribu');

    // Also mock Binance Depth since logic now waits for ALL involved exchanges
    if (!CoinDataService.depthCache[coin]) CoinDataService.depthCache[coin] = {};
    CoinDataService.depthCache[coin]['Binance'] = { asks: [], bids: [] }; // Empty is fine, just need it to exist

    // 3. Second Calculation
    console.log('3. Second Calculation (With Depth Cache)...');
    CoinDataService.calculateCoinMetrics(coin);

    item = CoinDataService.coinList[coin];
    if (item.arbitrageDetails) {
        console.log('Arb Details:', item.arbitrageDetails);

        // Volume = 22.0 (Total Paribu Asks: 2.0 + 20.0)
        // Cost = 22.0 * 105 = 2310 TL

        if (item.arbitrageDetails.tradeAmountTRY === 2310) {
            console.log('✅ Paribu Volume Logic Working (Total Depth: 22.0 units / 2310 TL)');
        } else {
            console.error(`❌ Logic Failed. Expected Cost 2310, got ${item.arbitrageDetails.tradeAmountTRY}`);
        }
    } else {
        console.error('❌ No arbitrage detected in second pass.');
    }
}

verifyParibuLogic();
