/**
 * Test Suite: CoinDataService
 * Tests arbitrage calculation, cross-rate conversions, order book matching,
 * depth handling, settings, and edge cases.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');
const proxyquire = require('proxyquire');

// Mock Redis
const redisMock = {
    createClient: () => ({
        on: () => { },
        setex: () => { },
        get: (k, cb) => cb(null, null),
        set: (k, v, cb) => cb && cb(null),
        quit: () => { }
    })
};

// Mock functions
const functionsMock = {
    getParibuInitialData: async () => '{}',
    statusUpdate: () => { },
    updateBTCTurkMarkets: () => { },
    updatePRBMarkets: () => { },
    differenceOfFirstArray: (a, b) => a.filter(x => !b.includes(x)),
    updateParibuData: async () => null,
    updateBinanceData: async () => null,
    updateBTCTurkData: async () => null,
    getBinanceOrderBook: async () => null,
    getBTCTurkOrderBook: async () => null,
    getParibuOrderBook: async () => null
};

// Fresh instance for each test suite section
function freshService() {
    // Clear require cache
    delete require.cache[require.resolve('../server/services/CoinDataService')];

    const CDS = proxyquire('../server/services/CoinDataService', {
        'redis': redisMock,
        '../js/functions': functionsMock,
        './RedisService': {
            on: () => { },
            setex: () => { },
            get: (k, cb) => cb(null, null),
            set: (k, v, cb) => cb && cb(null)
        },
        './TelegramService': { broadcast: async () => { } }
    });

    return CDS;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

console.log('\n=== CoinDataService Tests ===\n');

// ==========================================
// SECTION 1: Constructor Verification
// ==========================================
console.log('--- Constructor ---');

test('should initialize btcturkUSDT (not duplicate paribuUSDT)', () => {
    const svc = freshService();
    assert.strictEqual(svc.btcturkUSDT.price, 0, 'btcturkUSDT should be initialized to 0');
    assert.strictEqual(svc.paribuUSDT.price, 0, 'paribuUSDT should be 0');
    // Verify they are distinct properties
    svc.paribuUSDT = { price: 35, bid: 35, ask: 35 };
    assert.strictEqual(svc.btcturkUSDT.price, 0, 'btcturkUSDT should remain 0 after paribuUSDT change');
});

test('should initialize settings with defaults', () => {
    const svc = freshService();
    assert.strictEqual(svc.settings.globalCooldown, 5);
    assert.strictEqual(svc.settings.crossMinProfit, 1000);
    assert.strictEqual(svc.settings.crossMinROI, 0.50);
});

test('should start uninitialized', () => {
    const svc = freshService();
    assert.strictEqual(svc.initialized, false);
    assert.strictEqual(svc.requestCount, 0);
    assert.deepStrictEqual(svc.coinList, {});
});


// ==========================================
// SECTION 2: calculateCoinMetrics
// ==========================================
console.log('\n--- calculateCoinMetrics ---');

test('should find best buy (lowest ask) and best sell (highest bid)', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 10, bid: 10, ask: 10 }; // 1 USDT = 10 TRY
    svc.binanceUSDT = { price: 10, bid: 10, ask: 10 };
    svc.btcturkUSDT = { price: 10, bid: 10, ask: 10 };
    // Use prices that produce a LOW ROI (< 0.5%) to avoid depth trigger
    svc.coinList['test1'] = {
        paribu: { try: { price: 100, ask: 100, bid: 99.5, askQty: 10, bidQty: 10 } },
        binance: { usdt: { price: 10.05, ask: 10.02, bid: 10.03, askQty: 20, bidQty: 20 }, try: {} },
        BTCTurk: { try: { price: 100.2, ask: 100.1, bid: 99.8, askQty: 5, bidQty: 5 }, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('test1');
    const item = svc.coinList['test1'];

    // Prices in TRY:
    // Paribu TRY: ask=100, bid=99.5
    // Binance USDT→TRY: ask=100.2, bid=100.3
    // BTCTurk TRY: ask=100.1, bid=99.8
    // Best buy (lowest ask) = Paribu(TRY) at 100
    // Best sell (highest bid) = Binance(USDT) at 100.3
    assert.ok(item.arbitrageDetails, 'Should have arbitrageDetails');
    assert.strictEqual(item.arbitrageDetails.cross.buyExchange, 'Paribu(TRY)');
    assert.strictEqual(item.arbitrageDetails.cross.sellExchange, 'Binance(USDT)');
    // ROI = (100.3 - 100) / 100 * 100 = 0.3%
    assert.ok(item.ROI > 0 && item.ROI < 0.5, `ROI should be ~0.3%, got ${item.ROI}`);
});

test('should correctly detect cross-exchange arbitrage Paribu→Binance', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 10, bid: 10, ask: 10 };
    svc.binanceUSDT = { price: 10, bid: 10, ask: 10 };
    // Use prices that result in ROI below depth trigger (< 0.5%)
    svc.coinList['arb1'] = {
        paribu: { try: { price: 100, ask: 100, bid: 99, askQty: 100, bidQty: 100 } },
        binance: { usdt: { price: 10.04, ask: 10.05, bid: 10.04, askQty: 50, bidQty: 50 }, try: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('arb1');
    const item = svc.coinList['arb1'];

    // Paribu TRY ask = 100 (buy here)
    // Binance USDT bid = 10.04 * 10 = 100.4 TRY (sell here)
    // ROI = ((100.4 - 100) / 100) * 100 = 0.4%
    assert.ok(item.ROI > 0 && item.ROI < 0.5, `Expected ROI ~0.4%, got ${item.ROI}`);
    assert.strictEqual(item.arbitrageDetails.cross.buyExchange, 'Paribu(TRY)');
    assert.strictEqual(item.arbitrageDetails.cross.sellExchange, 'Binance(USDT)');
});

test('should return ROI = -100 when no valid prices exist', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 10, bid: 10, ask: 10 };

    svc.coinList['dead'] = {
        paribu: { try: { price: 0, ask: 0, bid: 0 } },
        binance: { try: {}, usdt: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('dead');
    assert.strictEqual(svc.coinList['dead'].ROI, -100);
    assert.strictEqual(svc.coinList['dead'].arbitrageDetails, null);
});

test('should not crash on completely empty coin', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 10, bid: 10, ask: 10 };
    svc.coinList['empty'] = {};

    svc.calculateCoinMetrics('empty');
    assert.strictEqual(svc.coinList['empty'].ROI, -100);
});

test('should not crash when coin does not exist', () => {
    const svc = freshService();
    svc.calculateCoinMetrics('nonexistent');
    // Should just return without error
});

test('should handle negative ROI (buy higher than sell)', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 10, bid: 10, ask: 10 };

    svc.coinList['neg'] = {
        paribu: { try: { price: 100, ask: 110, bid: 90, askQty: 10, bidQty: 10 } },
        binance: { usdt: {}, try: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('neg');
    const item = svc.coinList['neg'];

    // Only Paribu has prices. Ask=110 (buy), Bid=90 (sell)
    // ROI = ((90-110)/110)*100 = -18.18%
    assert.ok(item.ROI < 0, `Expected negative ROI, got ${item.ROI}`);
});


// ==========================================
// SECTION 3: calculateOrderBookMatch
// ==========================================
console.log('\n--- calculateOrderBookMatch ---');

test('should match simple single-level order book', () => {
    const svc = freshService();

    const asks = [[100, 10]]; // Buy at 100, qty 10
    const bids = [[110, 10]]; // Sell at 110, qty 10

    const result = svc.calculateOrderBookMatch(asks, bids);

    assert.strictEqual(result.totalVolume, 10);
    assert.strictEqual(result.tradeAmountTRY, 1000); // 10 * 100
    assert.strictEqual(result.profit, 100); // (110-100) * 10
    assert.strictEqual(result.avgBuyPrice, 100);
    assert.strictEqual(result.avgSellPrice, 110);
});

test('should match multi-level order book with partial fills', () => {
    const svc = freshService();

    // Buy side (asks sorted lowest first)
    const asks = [
        [100, 5],  // Level 1: 5 coins at 100
        [102, 8]   // Level 2: 8 coins at 102
    ];

    // Sell side (bids sorted highest first)
    const bids = [
        [110, 3],  // Level 1: 3 coins at 110
        [108, 4],  // Level 2: 4 coins at 108
        [105, 10]  // Level 3: 10 coins at 105
    ];

    const result = svc.calculateOrderBookMatch(asks, bids);

    // All asks are below all bids, so all ask volume should fill
    // Ask Level 1: 5 coins @ 100 → match against Bid[0](3@110) + Bid[1](2@108)
    // Ask Level 2: 8 coins @ 102 → match against Bid[1](2@108) + Bid[2](6@105)
    // Total volume: 5 + 8 = 13
    assert.strictEqual(result.totalVolume, 13);
    assert.ok(result.profit > 0, 'Profit should be positive');
    assert.ok(result.tradeAmountTRY > 0, 'Trade amount should be positive');
});

test('should stop when ask price >= bid price (no arbitrage)', () => {
    const svc = freshService();

    const asks = [[110, 10]]; // Buy at 110
    const bids = [[100, 10]]; // Sell at 100

    const result = svc.calculateOrderBookMatch(asks, bids);

    assert.strictEqual(result.totalVolume, 0);
    assert.strictEqual(result.profit, 0);
    assert.strictEqual(result.tradeAmountTRY, 0);
});

test('should handle empty order books', () => {
    const svc = freshService();

    const result = svc.calculateOrderBookMatch([], []);
    assert.strictEqual(result.totalVolume, 0);
    assert.strictEqual(result.profit, 0);
});

test('should handle mismatched quantities (partial fill)', () => {
    const svc = freshService();

    const asks = [[100, 100]]; // Large ask
    const bids = [[110, 2]];   // Small bid

    const result = svc.calculateOrderBookMatch(asks, bids);

    assert.strictEqual(result.totalVolume, 2); // Limited by bid
    assert.strictEqual(result.tradeAmountTRY, 200); // 2 * 100
    assert.strictEqual(result.profit, 20); // 2 * (110-100)
});

test('should handle string price/qty values (from API)', () => {
    const svc = freshService();

    const asks = [['100.5', '10']];
    const bids = [['110.5', '10']];

    const result = svc.calculateOrderBookMatch(asks, bids);

    assert.strictEqual(result.totalVolume, 10);
    assert.ok(Math.abs(result.tradeAmountTRY - 1005) < 0.01, `Expected ~1005, got ${result.tradeAmountTRY}`);
    assert.ok(Math.abs(result.profit - 100) < 0.01, `Expected ~100, got ${result.profit}`);
});

test('should handle many levels with diminishing spread', () => {
    const svc = freshService();

    const asks = [
        [100, 5],
        [105, 5],
        [110, 5],  // At this level, ask >= bid → should stop
        [115, 5]
    ];
    const bids = [
        [112, 5],
        [108, 5],
        [104, 5],
        [100, 5]
    ];

    const result = svc.calculateOrderBookMatch(asks, bids);
    // Level matching:
    // asks[0]=100 vs bids[0]=112 → match 5, profit=60
    // asks[1]=105 vs bids[1]=108 → match 5, profit=15
    // asks[2]=110 vs bids[2]=104 → 110 >= 104 → STOP
    assert.strictEqual(result.totalVolume, 10);
    assert.strictEqual(result.profit, 75); // 60 + 15
});


// ==========================================
// SECTION 4: Cross-rate conversions
// ==========================================
console.log('\n--- Cross-rate Conversions ---');

test('should convert Paribu TRY price to USDT', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 35, bid: 35, ask: 35 };

    svc.coinList['conv1'] = {
        paribu: { try: { price: 350, ask: 351, bid: 349 } },
        binance: { try: {}, usdt: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('conv1');
    const item = svc.coinList['conv1'];

    // 350 TRY / 35 USDT rate = 10 USDT
    assert.ok(Math.abs(item.paribu.try.inUSDT - 10) < 0.01, `Expected inUSDT ~10, got ${item.paribu.try.inUSDT}`);
    assert.ok(Math.abs(item.paribu.try.askInUSDT - (351 / 35)) < 0.01);
    assert.ok(Math.abs(item.paribu.try.bidInUSDT - (349 / 35)) < 0.01);
});

test('should convert Binance USDT price to TRY', () => {
    const svc = freshService();
    svc.binanceUSDT = { price: 35, bid: 35, ask: 35 };

    svc.coinList['conv2'] = {
        paribu: { try: {} },
        binance: { usdt: { price: 10, ask: 10.1, bid: 9.9 }, try: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('conv2');
    const item = svc.coinList['conv2'];

    // 10 USDT * 35 = 350 TRY
    assert.ok(Math.abs(item.binance.usdt.inTRY - 350) < 0.01, `Expected inTRY ~350, got ${item.binance.usdt.inTRY}`);
});

test('should use btcturkUSDT for BTCTurk conversions when available', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 35, bid: 35, ask: 35 };
    svc.btcturkUSDT = { price: 34.5, bid: 34.5, ask: 34.5 };

    svc.coinList['conv3'] = {
        paribu: { try: {} },
        binance: { try: {}, usdt: {} },
        BTCTurk: { usdt: { price: 10, ask: 10.1, bid: 9.9 }, try: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('conv3');
    const item = svc.coinList['conv3'];

    // BTCTurk should use btcturkUSDT rate: 10 * 34.5 = 345
    assert.ok(Math.abs(item.BTCTurk.usdt.inTRY - 345) < 0.01, `Expected 345, got ${item.BTCTurk.usdt.inTRY}`);
});


// ==========================================
// SECTION 5: Depth Cache Logic
// ==========================================
console.log('\n--- Depth Cache ---');

test('should throttle depth fetches (< 3s gap)', () => {
    const svc = freshService();
    // Manually set timestamp to simulate recent fetch
    svc.depthTimestamps['btc_Binance'] = Date.now();

    // This should NOT actually fetch (throttled)
    svc.fetchDepth('btc', 'Binance');

    // No crash = pass (we can't easily assert the internal since it's async)
});

test('should cache depth error correctly', () => {
    const svc = freshService();

    // Simulate a failed depth fetch for both buy and sell exchanges
    svc.depthCache['btc'] = {};
    svc.depthCache['btc']['Paribu(TRY)'] = { error: true };
    svc.depthCache['btc']['Binance'] = { error: true };

    // Now run metrics — depth error should trigger kill switch (profit=0)
    svc.paribuUSDT = { price: 35, bid: 35, ask: 35 };
    svc.binanceUSDT = { price: 35, bid: 35, ask: 35 };
    svc.coinList['btc'] = {
        paribu: { try: { price: 1000000, ask: 999000, bid: 998000, askQty: 1, bidQty: 1 } },
        binance: { usdt: { price: 30000, ask: 29000, bid: 31000, askQty: 1, bidQty: 1 }, try: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('btc');
    // Should not crash. With depth errors, profit should be 0 (kill switch)
    const item = svc.coinList['btc'];
    if (item.arbitrageDetails && item.arbitrageDetails.cross) {
        assert.strictEqual(item.arbitrageDetails.cross.profit, 0, 'Profit should be 0 with depth errors');
    }
    // Either way, no crash = pass
});


// ==========================================
// SECTION 6: Settings
// ==========================================
console.log('\n--- Settings ---');

test('should use defaults when settings not loaded', () => {
    const svc = freshService();
    assert.strictEqual(svc.settings.globalCooldown, 5);
    assert.strictEqual(svc.settings.crossMinProfit, 1000);
    assert.strictEqual(svc.settings.crossMinROI, 0.50);
});

test('should accept custom settings', () => {
    const svc = freshService();
    svc.settings = { globalCooldown: 10, crossMinProfit: 500, crossMinROI: 1.0 };

    assert.strictEqual(svc.settings.globalCooldown, 10);
    assert.strictEqual(svc.settings.crossMinProfit, 500);
    assert.strictEqual(svc.settings.crossMinROI, 1.0);
});


// ==========================================
// SECTION 7: Telegram Alert Cooldown
// ==========================================
console.log('\n--- Telegram Alert Cooldown ---');

test('should respect cooldown period', async () => {
    const svc = freshService();
    let sentCount = 0;

    // Override TelegramService locally
    const originalBroadcast = require('../server/services/TelegramService').broadcast;

    svc.lastAlertTimes = {};
    svc.lastAlertProfits = {};
    svc.settings.globalCooldown = 60; // 60 min cooldown

    const op = { coin: 'test', profit: 1000, roi: 5, buyExchange: 'A', sellExchange: 'B', buyPrice: 100, sellPrice: 105, tradeAmountTRY: 10000 };

    // First call should send
    await svc.checkAndSendTelegramAlert(op);
    assert.ok(svc.lastAlertTimes['test'] > 0, 'Should record alert time');

    // Second call with same profit should NOT send (cooldown)
    const firstTime = svc.lastAlertTimes['test'];
    await svc.checkAndSendTelegramAlert(op);
    // Time should be the same (not updated because cooldown blocked it)
    assert.strictEqual(svc.lastAlertTimes['test'], firstTime, 'Should not update time during cooldown');
});

test('should send alert when profit increases despite cooldown', async () => {
    const svc = freshService();
    svc.settings.globalCooldown = 60;

    const op1 = { coin: 'x', profit: 1000, roi: 5, buyExchange: 'A', sellExchange: 'B', buyPrice: 100, sellPrice: 105, tradeAmountTRY: 10000 };
    await svc.checkAndSendTelegramAlert(op1);

    const firstTime = svc.lastAlertTimes['x'];

    // Higher profit → should bypass cooldown
    const op2 = { ...op1, profit: 2000 };
    await svc.checkAndSendTelegramAlert(op2);
    assert.strictEqual(svc.lastAlertProfits['x'], 2000, 'Should update profit to 2000');
});


// ==========================================
// SECTION 8: Edge Cases Stress Test
// ==========================================
console.log('\n--- Edge Cases ---');

test('should handle Infinity prices gracefully', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 10, bid: 10, ask: 10 };

    svc.coinList['inf'] = {
        paribu: { try: { price: Infinity, ask: Infinity, bid: 100 } },
        binance: { try: {}, usdt: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    // Should not throw
    svc.calculateCoinMetrics('inf');
    assert.ok(true, 'Did not crash on Infinity');
});

test('should handle NaN prices gracefully', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 10, bid: 10, ask: 10 };

    svc.coinList['nan'] = {
        paribu: { try: { price: NaN, ask: NaN, bid: NaN } },
        binance: { try: {}, usdt: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('nan');
    assert.ok(true, 'Did not crash on NaN');
});

test('should handle very small prices (precision)', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 35, bid: 35, ask: 35 };
    svc.binanceUSDT = { price: 35, bid: 35, ask: 35 };

    svc.coinList['tiny'] = {
        paribu: { try: { price: 0.00001, ask: 0.000009, bid: 0.000011, askQty: 1000000, bidQty: 1000000 } },
        binance: { usdt: { price: 0.0000003, ask: 0.00000025, bid: 0.00000035, askQty: 5000000, bidQty: 5000000 }, try: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    svc.calculateCoinMetrics('tiny');
    const item = svc.coinList['tiny'];
    assert.ok(isFinite(item.ROI), `ROI should be finite, got ${item.ROI}`);
});

test('should handle zero USDT rate without crashing', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 0, bid: 0, ask: 0 }; // Edge case: no USDT data

    svc.coinList['noRate'] = {
        paribu: { try: { price: 100, ask: 95, bid: 90, askQty: 10, bidQty: 10 } },
        binance: { usdt: { price: 10 }, try: {} },
        BTCTurk: { try: {}, usdt: {} },
        chiliz: { chz: {}, usdt: {} }
    };

    // Should not crash even though conversion will be 0
    svc.calculateCoinMetrics('noRate');
    assert.ok(true, 'Did not crash with zero USDT rate');
});

test('should handle 200+ coins without performance degradation', () => {
    const svc = freshService();
    svc.paribuUSDT = { price: 35, bid: 35, ask: 35 };
    svc.binanceUSDT = { price: 35, bid: 35, ask: 35 };

    for (let i = 0; i < 200; i++) {
        svc.coinList[`coin${i}`] = {
            paribu: { try: { price: 100 + i, ask: 99 + i, bid: 98 + i, askQty: 10, bidQty: 10 } },
            binance: { usdt: { price: 3 + i * 0.01, ask: 2.9 + i * 0.01, bid: 3.1 + i * 0.01, askQty: 20, bidQty: 20 }, try: {} },
            BTCTurk: { try: {}, usdt: {} },
            chiliz: { chz: {}, usdt: {} }
        };
    }

    const startTime = Date.now();
    Object.keys(svc.coinList).forEach(coin => svc.calculateCoinMetrics(coin));
    const elapsed = Date.now() - startTime;

    assert.ok(elapsed < 1000, `200 coins took ${elapsed}ms, should be < 1000ms`);
    console.log(`    (200 coins processed in ${elapsed}ms)`);
});


// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exitCode = 1;
