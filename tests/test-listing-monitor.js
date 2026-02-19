/**
 * Test Suite: ListingMonitorService
 * Tests state initialization, change detection, and alerting.
 * Uses proxyquire to properly mock axios at the module level.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');
const proxyquire = require('proxyquire');

let broadcastMessages = [];

function defaultPayload() {
    return {
        data: {
            payload: {
                markets: { 'btc_tl': {}, 'eth_tl': {}, 'sol_tl': {} },
                currencies: { 'btc': {}, 'eth': {}, 'sol': {} },
                fee_matrix: { 'btc-tl': 0.01, 'eth-tl': 0.01 }
            }
        }
    };
}

function freshMonitor(axiosGetFn) {
    broadcastMessages = [];
    delete require.cache[require.resolve('../server/services/ListingMonitorService')];

    return proxyquire('../server/services/ListingMonitorService', {
        'axios': {
            get: axiosGetFn || (async () => defaultPayload()),
            '@noCallThru': true
        },
        './TelegramService': {
            broadcast: async (msg) => { broadcastMessages.push(msg); },
            '@noCallThru': true
        },
        '../configs/config.json': {
            exchangeMarkets: {
                paribu: {
                    initialsUrl: 'https://mock.paribu.com/initials',
                    tickerUrl: 'https://mock.paribu.com/ticker'
                }
            },
            '@noCallThru': true
        }
    });
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

async function asyncTest(name, fn) {
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
    console.log('\n=== ListingMonitorService Tests ===\n');

    // --- getDifference ---
    console.log('--- getDifference ---');

    test('should return new items in first array', () => {
        const monitor = freshMonitor();
        const result = monitor.getDifference(['a', 'b', 'c'], ['a', 'b']);
        assert.deepStrictEqual(result, ['c']);
    });

    test('should return empty for identical arrays', () => {
        const monitor = freshMonitor();
        const result = monitor.getDifference(['a', 'b'], ['a', 'b']);
        assert.deepStrictEqual(result, []);
    });

    test('should handle null arrays', () => {
        const monitor = freshMonitor();
        assert.deepStrictEqual(monitor.getDifference(null, ['a']), []);
        assert.deepStrictEqual(monitor.getDifference(['a'], null), []);
        assert.deepStrictEqual(monitor.getDifference(null, null), []);
    });

    // --- updateState ---
    console.log('\n--- updateState ---');

    test('should update state correctly', () => {
        const monitor = freshMonitor();
        monitor.updateState('paribu', ['btc_tl'], ['btc'], ['btc-tl']);
        assert.deepStrictEqual(monitor.previousState.paribu.markets, ['btc_tl']);
        assert.deepStrictEqual(monitor.previousState.paribu.currencies, ['btc']);
        assert.deepStrictEqual(monitor.previousState.paribu.tickers, ['btc-tl']);
    });

    // --- init ---
    console.log('\n--- init ---');

    await asyncTest('should initialize with silent mode (no alerts)', async () => {
        const monitor = freshMonitor();
        await monitor.init();
        assert.strictEqual(monitor.isInitialized, true);
        assert.strictEqual(broadcastMessages.length, 0, 'Should not send alerts on init');
    });

    await asyncTest('should populate previous state on init', async () => {
        const monitor = freshMonitor();
        await monitor.init();
        assert.ok(monitor.previousState.paribu.markets.length > 0, 'Should have markets');
        assert.ok(monitor.previousState.paribu.currencies.length > 0, 'Should have currencies');
    });

    await asyncTest('should not reinitialize if already initialized', async () => {
        const monitor = freshMonitor();
        await monitor.init();
        const firstState = [...monitor.previousState.paribu.markets];
        await monitor.init();
        assert.deepStrictEqual(monitor.previousState.paribu.markets, firstState);
    });

    // --- checkParibuListings ---
    console.log('\n--- checkParibuListings ---');

    await asyncTest('should detect new market listings', async () => {
        let callCount = 0;
        const monitor = freshMonitor(async () => {
            callCount++;
            if (callCount <= 1) {
                // First call (init): 3 markets
                return defaultPayload();
            }
            // Second call: 4 markets (new: avax_tl)
            return {
                data: {
                    payload: {
                        markets: { 'btc_tl': {}, 'eth_tl': {}, 'sol_tl': {}, 'avax_tl': {} },
                        currencies: { 'btc': {}, 'eth': {}, 'sol': {}, 'avax': {} },
                        fee_matrix: { 'btc-tl': 0.01, 'eth-tl': 0.01, 'avax-tl': 0.01 }
                    }
                }
            };
        });

        await monitor.init();
        assert.strictEqual(broadcastMessages.length, 0, 'Init should be silent');

        await monitor.checkParibuListings();
        assert.ok(broadcastMessages.length > 0, 'Should send alert for new listing');
        const alertText = broadcastMessages.join(' ');
        assert.ok(alertText.includes('AVAX') || alertText.includes('avax'),
            `Alert should mention AVAX, got: ${alertText.substring(0, 100)}`);
    });

    await asyncTest('should not alert when no changes', async () => {
        const monitor = freshMonitor();
        await monitor.init();
        broadcastMessages = [];

        // Same data, no changes
        await monitor.checkParibuListings();
        assert.strictEqual(broadcastMessages.length, 0, 'Should not alert when nothing changed');
    });

    await asyncTest('should handle API errors gracefully', async () => {
        const monitor = freshMonitor(async () => { throw new Error('Network Error'); });
        // init will fail silently
        await monitor.checkParibuListings();
        // Should not crash
        assert.ok(true, 'Did not crash on API error');
    });

    // --- Summary ---
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exitCode = 1;
}

runTests();
