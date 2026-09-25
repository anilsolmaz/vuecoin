/**
 * Test Suite: ExchangePrecisionService
 * Tests tickSizeToPrecision conversion, optimal fraction computation,
 * coin-specific precision lookup, coinList application, and lifecycle management.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');
const ExchangePrecisionService = require('../server/services/ExchangePrecisionService');

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

async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

async function runTests() {
    console.log('\n=== ExchangePrecisionService Tests ===\n');

    test('tickSizeToPrecision should correctly convert various tick sizes', () => {
        assert.strictEqual(ExchangePrecisionService.tickSizeToPrecision('0.01000000'), 2);
        assert.strictEqual(ExchangePrecisionService.tickSizeToPrecision('0.00001000'), 5);
        assert.strictEqual(ExchangePrecisionService.tickSizeToPrecision('0.00000001'), 8);
        assert.strictEqual(ExchangePrecisionService.tickSizeToPrecision('1.00000000'), 0);
        assert.strictEqual(ExchangePrecisionService.tickSizeToPrecision('10'), 0);
        assert.strictEqual(ExchangePrecisionService.tickSizeToPrecision('0.5'), 1);
        assert.strictEqual(ExchangePrecisionService.tickSizeToPrecision(null), 4);
        assert.strictEqual(ExchangePrecisionService.tickSizeToPrecision(''), 4);
    });

    test('computeOptimalFraction should prioritize Paribu TRY, then BTCTurk TRY, then Binance USDT', () => {
        // Case 1: Paribu TRY present
        const p1 = {
            paribu: { try: 2, usdt: 2 },
            btcturk: { try: 3, usdt: 2 },
            binance: { usdt: 4, try: 1 }
        };
        assert.strictEqual(ExchangePrecisionService.computeOptimalFraction(p1), 2);

        // Case 2: Only BTCTurk TRY present
        const p2 = {
            paribu: {},
            btcturk: { try: 3, usdt: 3 },
            binance: { usdt: 4, try: 1 }
        };
        assert.strictEqual(ExchangePrecisionService.computeOptimalFraction(p2), 3);

        // Case 3: Only Binance USDT present
        const p3 = {
            paribu: {},
            btcturk: {},
            binance: { usdt: 6 }
        };
        assert.strictEqual(ExchangePrecisionService.computeOptimalFraction(p3), 6);

        // Case 4: None present
        assert.strictEqual(ExchangePrecisionService.computeOptimalFraction({}), 4);
        assert.strictEqual(ExchangePrecisionService.computeOptimalFraction(null), 4);
    });

    test('getPrecisionForCoin should return cached precision or sensible heuristic', () => {
        // Seed map
        ExchangePrecisionService.precisionMap['testcoin'] = {
            fraction: 5,
            precisions: {
                paribu: { try: 5 },
                btcturk: { try: 5 },
                binance: { usdt: 6 }
            }
        };

        const cached = ExchangePrecisionService.getPrecisionForCoin('testcoin');
        assert.strictEqual(cached.fraction, 5);
        assert.strictEqual(cached.precisions.binance.usdt, 6);

        // Fallback heuristics for unseeded coins
        assert.strictEqual(ExchangePrecisionService.getPrecisionForCoin('btc').fraction, 0);
        assert.strictEqual(ExchangePrecisionService.getPrecisionForCoin('eth').fraction, 0);
        assert.strictEqual(ExchangePrecisionService.getPrecisionForCoin('pepe').fraction, 8);
        assert.strictEqual(ExchangePrecisionService.getPrecisionForCoin('shib').fraction, 8);
        assert.strictEqual(ExchangePrecisionService.getPrecisionForCoin('sol').fraction, 2);
        assert.strictEqual(ExchangePrecisionService.getPrecisionForCoin('doge').fraction, 4);
        assert.strictEqual(ExchangePrecisionService.getPrecisionForCoin('randomunknowncoin').fraction, 4);
    });

    test('applyToCoinList should update fraction and precisions on all target coins', () => {
        const mockCoinList = {
            btc: { ROI: 1.5, fraction: 4 },
            pepe: { ROI: 0.2, fraction: 2 },
            testcoin: { ROI: -1, fraction: 1 }
        };

        ExchangePrecisionService.applyToCoinList(mockCoinList);

        assert.strictEqual(mockCoinList.btc.fraction, 0);
        assert.ok(mockCoinList.btc.precisions);
        assert.strictEqual(mockCoinList.pepe.fraction, 8);
        assert.strictEqual(mockCoinList.testcoin.fraction, 5);
        assert.strictEqual(mockCoinList.testcoin.precisions.binance.usdt, 6);
    });

    test('start and stop should manage periodic update timer', () => {
        ExchangePrecisionService.stop();
        assert.strictEqual(ExchangePrecisionService.timer, null);

        // Simulate start without network call
        ExchangePrecisionService.timer = setInterval(() => {}, 60000);
        assert.ok(ExchangePrecisionService.timer !== null);

        ExchangePrecisionService.stop();
        assert.strictEqual(ExchangePrecisionService.timer, null);
    });

    await testAsync('updatePrecisions should fetch and merge exchange precision data', async () => {
        const stats = await ExchangePrecisionService.updatePrecisions();
        assert.ok(stats, 'Should return update statistics');
        assert.ok(stats.totalCoins > 100, `Should parse over 100 coins, got: ${stats.totalCoins}`);
        assert.ok(ExchangePrecisionService.lastUpdated instanceof Date);

        // Verify known market data
        const btc = ExchangePrecisionService.getPrecisionForCoin('btc');
        assert.strictEqual(btc.fraction, 0);
        assert.strictEqual(btc.precisions.binance.usdt, 2);

        const sol = ExchangePrecisionService.getPrecisionForCoin('sol');
        assert.strictEqual(sol.fraction, 2);

        const pepe = ExchangePrecisionService.getPrecisionForCoin('pepe');
        assert.strictEqual(pepe.fraction, 8);
    });

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    if (failed > 0) process.exit(1);
}

runTests();
