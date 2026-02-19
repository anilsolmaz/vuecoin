/**
 * Test Suite: ExchangeMonitorService
 * Tests state transitions (UP→DOWN→UP) and alert logic.
 * Uses sequential async execution to avoid race conditions.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');
const proxyquire = require('proxyquire');

let broadcastMessages = [];

// Mock TelegramService
const TelegramMock = {
    broadcast: async (msg) => { broadcastMessages.push(msg); }
};

// Fresh instance for each test
function freshMonitor() {
    broadcastMessages = [];
    delete require.cache[require.resolve('../server/services/ExchangeMonitorService')];

    return proxyquire('../server/services/ExchangeMonitorService', {
        './TelegramService': TelegramMock
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
    console.log('\n=== ExchangeMonitorService Tests ===\n');

    // --- Initial State ---
    console.log('--- Initial State ---');

    test('should start with all exchanges UP', () => {
        const monitor = freshMonitor();
        assert.strictEqual(monitor.statuses.paribu, 'UP');
        assert.strictEqual(monitor.statuses.binance, 'UP');
        assert.strictEqual(monitor.statuses.btcturk, 'UP');
    });

    // --- State Transitions ---
    console.log('\n--- State Transitions ---');

    await asyncTest('reportFailure should set status to DOWN', async () => {
        const monitor = freshMonitor();
        await monitor.reportFailure('paribu', new Error('Connection timeout'));
        assert.strictEqual(monitor.statuses.paribu, 'DOWN');
    });

    await asyncTest('reportFailure should send Telegram alert', async () => {
        const monitor = freshMonitor();
        await monitor.reportFailure('binance', new Error('Rate Limited'));
        assert.ok(broadcastMessages.length > 0, 'Should send alert');
        assert.ok(broadcastMessages[0].includes('API DOWN'), 'Alert should mention DOWN');
        assert.ok(broadcastMessages[0].toUpperCase().includes('BINANCE'), 'Alert should mention exchange');
    });

    await asyncTest('reportSuccess should set status back to UP', async () => {
        const monitor = freshMonitor();
        await monitor.reportFailure('paribu', new Error('timeout'));
        assert.strictEqual(monitor.statuses.paribu, 'DOWN');

        broadcastMessages = [];
        await monitor.reportSuccess('paribu');
        assert.strictEqual(monitor.statuses.paribu, 'UP');
        assert.ok(broadcastMessages.length > 0, 'Should send recovery alert');
        assert.ok(broadcastMessages[0].includes('RECOVERED'), 'Alert should mention RECOVERED');
    });

    await asyncTest('reportFailure should not send duplicate alerts', async () => {
        const monitor = freshMonitor();
        await monitor.reportFailure('paribu', new Error('timeout'));
        const firstCount = broadcastMessages.length;

        await monitor.reportFailure('paribu', new Error('timeout again'));
        assert.strictEqual(broadcastMessages.length, firstCount, 'Should not send second alert');
    });

    await asyncTest('reportSuccess when already UP should not send alert', async () => {
        const monitor = freshMonitor();
        // Already UP by default, no prior failure
        broadcastMessages = [];
        await monitor.reportSuccess('paribu');
        assert.strictEqual(broadcastMessages.length, 0, 'Should not send recovery alert when already UP');
    });

    // --- Error Details ---
    console.log('\n--- Error Details ---');

    await asyncTest('should detect rate limiting (HTTP 429)', async () => {
        const monitor = freshMonitor();
        const error = new Error('Request failed');
        error.response = { status: 429 };
        await monitor.reportFailure('binance', error);
        assert.strictEqual(monitor.lastErrorMessages.binance, 'Rate Limited (HTTP 429)');
    });

    await asyncTest('should detect connection timeout', async () => {
        const monitor = freshMonitor();
        const error = new Error('timeout');
        error.code = 'ECONNABORTED';
        await monitor.reportFailure('btcturk', error);
        assert.strictEqual(monitor.lastErrorMessages.btcturk, 'Request Timeout');
    });

    await asyncTest('should handle generic errors', async () => {
        const monitor = freshMonitor();
        await monitor.reportFailure('paribu', new Error('Network Error'));
        assert.strictEqual(monitor.lastErrorMessages.paribu, 'Network Error');
    });

    // --- Full Cycle ---
    console.log('\n--- Full Cycle (UP→DOWN→UP) ---');

    await asyncTest('should complete full UP→DOWN→UP cycle for all exchanges', async () => {
        const monitor = freshMonitor();

        for (const exchange of ['paribu', 'binance', 'btcturk']) {
            assert.strictEqual(monitor.statuses[exchange], 'UP', `${exchange} should start UP`);

            await monitor.reportFailure(exchange, new Error('test failure'));
            assert.strictEqual(monitor.statuses[exchange], 'DOWN', `${exchange} should be DOWN`);

            await monitor.reportSuccess(exchange);
            assert.strictEqual(monitor.statuses[exchange], 'UP', `${exchange} should recover to UP`);
        }
    });

    // --- Summary ---
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exitCode = 1;
}

runTests();
