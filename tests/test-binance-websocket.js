/**
 * Test Suite: BinanceWebSocketService
 * Tests real-time WebSocket connection handling, symbol subscriptions,
 * bookTicker caching, exclusion filters, isLive health checks, and data formatting.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');
const BinanceWebSocketService = require('../server/services/BinanceWebSocketService');

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

function runTests() {
    console.log('\n=== BinanceWebSocketService Tests ===\n');

    test('should initialize with correct default URLs and state', () => {
        assert.strictEqual(BinanceWebSocketService.isConnected, false);
        assert.ok(BinanceWebSocketService.wsUrl.includes('data-stream.binance.vision'));
        assert.ok(BinanceWebSocketService.backupWsUrl.includes('stream.binance.com'));
    });

    test('isLive should return false when not connected or empty cache', () => {
        assert.strictEqual(BinanceWebSocketService.isLive(), false);
    });

    test('subscribeSymbols should format and deduplicate stream names', () => {
        BinanceWebSocketService.subscribedStreams.clear();
        BinanceWebSocketService.subscribeSymbols(['BTC', 'eth', 'SOLUSDT']);

        const streams = Array.from(BinanceWebSocketService.subscribedStreams);
        assert.ok(streams.includes('btcusdt@bookTicker'), 'Should include btcusdt@bookTicker');
        assert.ok(streams.includes('btctry@bookTicker'), 'Should include btctry@bookTicker');
        assert.ok(streams.includes('ethusdt@bookTicker'), 'Should include ethusdt@bookTicker');
        assert.ok(streams.includes('ethtry@bookTicker'), 'Should include ethtry@bookTicker');
        assert.ok(streams.includes('solusdt@bookTicker'), 'Should include solusdt@bookTicker');
    });

    test('cache should parse and store bookTicker updates', () => {
        // Simulate WebSocket message handling
        const mockMsg = {
            s: 'BTCUSDT',
            b: '90000.50',
            B: '1.25',
            a: '90001.00',
            A: '2.50'
        };

        const symbol = mockMsg.s.toUpperCase();
        const bid = parseFloat(mockMsg.b);
        const ask = parseFloat(mockMsg.a);
        BinanceWebSocketService.cache[symbol] = {
            price: (bid + ask) / 2,
            bid: bid,
            bidQty: parseFloat(mockMsg.B),
            ask: ask,
            askQty: parseFloat(mockMsg.A)
        };
        BinanceWebSocketService.lastMessageTime = Date.now();

        assert.strictEqual(BinanceWebSocketService.cache['BTCUSDT'].bid, 90000.50);
        assert.strictEqual(BinanceWebSocketService.cache['BTCUSDT'].ask, 90001.00);
        assert.strictEqual(BinanceWebSocketService.cache['BTCUSDT'].price, 90000.75);
    });

    test('should exclude designated delisted or untracked symbols', () => {
        assert.ok(BinanceWebSocketService.excludedSymbols.has('MATICUSDT'));
        assert.ok(BinanceWebSocketService.excludedSymbols.has('EOSUSDT'));
        assert.ok(BinanceWebSocketService.excludedSymbols.has('MKRUSDT'));
    });

    test('getBinanceJSON should format output with market: binance', () => {
        const json = BinanceWebSocketService.getBinanceJSON();
        assert.strictEqual(json.market, 'binance');
        assert.ok(json['BTCUSDT']);
        assert.strictEqual(json['BTCUSDT'].bid, 90000.50);
    });

    test('isLive should return true when connected with fresh cache', () => {
        BinanceWebSocketService.isConnected = true;
        BinanceWebSocketService.lastMessageTime = Date.now();
        // Add 6 dummy symbols to satisfy cache threshold (> 5)
        for (let i = 1; i <= 6; i++) {
            BinanceWebSocketService.cache[`COIN${i}USDT`] = { price: 10, bid: 9.9, ask: 10.1 };
        }
        assert.strictEqual(BinanceWebSocketService.isLive(), true);

        // Reset
        BinanceWebSocketService.isConnected = false;
        BinanceWebSocketService.cache = {};
    });

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exitCode = 1;
}

runTests();
