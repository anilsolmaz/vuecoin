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
    console.log('--- Verifying Paribu Volume Logic ---');

    // Setup Mock Coin
    const coin = "PARIBUTEST";
    CoinDataService.coinList[coin] = {
        paribu: { try: { price: 100, ask: 105, bid: 100 } },
        binance: { try: { price: 110, ask: 120, bid: 115, askQty: 50, bidQty: 50 } },
        BTCTurk: {}, chiliz: {}, FTX: {}
    };

    // 1. Prefill Cache to simulate fetch completion
    await CoinDataService.fetchDepth(coin, 'Paribu');

    // 2. Calculate
    CoinDataService.calculateCoinMetrics(coin);

    const item = CoinDataService.coinList[coin];
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
        console.error('❌ No arbitrage detected.');
    }
}

verifyParibuLogic();
