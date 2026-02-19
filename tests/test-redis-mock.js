/**
 * Test Suite: RedisService mock
 * Verifies that the test mock has all methods used in production code.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');
const client = require('../server/services/RedisService');

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

console.log('\n=== RedisService Mock Tests ===\n');

// --- Method existence ---
console.log('--- Method Existence ---');

test('should have "on" method', () => {
    assert.strictEqual(typeof client.on, 'function');
});

test('should have "get" method', () => {
    assert.strictEqual(typeof client.get, 'function');
});

test('should have "set" method', () => {
    assert.strictEqual(typeof client.set, 'function');
});

test('should have "setex" method (FIX VERIFIED)', () => {
    assert.strictEqual(typeof client.setex, 'function');
});

test('should have "lrange" method', () => {
    assert.strictEqual(typeof client.lrange, 'function');
});

test('should have "lpush" method', () => {
    assert.strictEqual(typeof client.lpush, 'function');
});

test('should have "lrem" method (FIX VERIFIED)', () => {
    assert.strictEqual(typeof client.lrem, 'function');
});

// --- Method behavior ---
console.log('\n--- Method Behavior ---');

test('get should return null data', (done) => {
    client.get('anykey', (err, data) => {
        assert.strictEqual(err, null);
        assert.strictEqual(data, null);
    });
});

test('lrange should return empty array', () => {
    client.lrange('anykey', 0, -1, (err, data) => {
        assert.strictEqual(err, null);
        assert.deepStrictEqual(data, []);
    });
});

test('setex should call callback without error', () => {
    let called = false;
    client.setex('key', 60, 'value', (err) => {
        called = true;
        assert.strictEqual(err, null);
    });
    assert.ok(called, 'Callback should be called');
});

test('setex should not crash without callback', () => {
    // setex is called without cb in some places (e.g. fire-and-forget)
    client.setex('key', 60, 'value');
    assert.ok(true, 'Did not crash without callback');
});

test('set should not crash without callback', () => {
    client.set('key', 'value');
    assert.ok(true);
});

test('lpush should not crash without callback', () => {
    client.lpush('key', 'value');
    assert.ok(true);
});

test('lrem should call callback with 0 removed count', () => {
    client.lrem('key', 0, 'value', (err, count) => {
        assert.strictEqual(err, null);
        assert.strictEqual(count, 0);
    });
});

test('on should accept event handler without error', () => {
    client.on('error', () => { });
    client.on('connect', () => { });
    assert.ok(true);
});

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exitCode = 1;
