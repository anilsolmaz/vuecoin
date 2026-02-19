/**
 * Test Suite: functions.js utility functions
 * Tests all exported utility methods without making any network requests.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');

// We need to load functions.js carefully because it requires Redis at top level.
// In test mode, RedisService returns a mock client.
const f = require('../server/js/functions');

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

console.log('\n=== functions.js Utility Tests ===\n');

// --- twoArrayDifference ---
console.log('--- twoArrayDifference ---');

test('should return symmetric difference of two arrays', () => {
    const result = f.twoArrayDifference(['a', 'b', 'c'], ['b', 'c', 'd']);
    assert.deepStrictEqual(result.sort(), ['a', 'd'].sort());
});

test('should return all elements when arrays have no overlap', () => {
    const result = f.twoArrayDifference(['a', 'b'], ['c', 'd']);
    assert.deepStrictEqual(result.sort(), ['a', 'b', 'c', 'd'].sort());
});

test('should return empty array when arrays are identical', () => {
    const result = f.twoArrayDifference(['a', 'b', 'c'], ['a', 'b', 'c']);
    assert.deepStrictEqual(result, []);
});

test('should handle empty arrays', () => {
    assert.deepStrictEqual(f.twoArrayDifference([], []), []);
    assert.deepStrictEqual(f.twoArrayDifference(['a'], []), ['a']);
    assert.deepStrictEqual(f.twoArrayDifference([], ['b']), ['b']);
});

// --- differenceOfFirstArray ---
console.log('\n--- differenceOfFirstArray ---');

test('should return elements in first array not in second', () => {
    const result = f.differenceOfFirstArray(['a', 'b', 'c'], ['b', 'c', 'd']);
    assert.deepStrictEqual(result, ['a']);
});

test('should return empty when first is subset of second', () => {
    const result = f.differenceOfFirstArray(['a', 'b'], ['a', 'b', 'c']);
    assert.deepStrictEqual(result, []);
});

test('should return all when no overlap', () => {
    const result = f.differenceOfFirstArray(['x', 'y'], ['a', 'b']);
    assert.deepStrictEqual(result, ['x', 'y']);
});

test('should handle empty arrays', () => {
    assert.deepStrictEqual(f.differenceOfFirstArray([], ['a']), []);
    assert.deepStrictEqual(f.differenceOfFirstArray(['a'], []), ['a']);
});

// --- removeDuplicatesFromArray ---
console.log('\n--- removeDuplicatesFromArray ---');

test('should remove duplicates', () => {
    const result = f.removeDuplicatesFromArray(['a', 'b', 'a', 'c', 'b']);
    assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

test('should handle array with no duplicates', () => {
    const result = f.removeDuplicatesFromArray(['a', 'b', 'c']);
    assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

test('should handle empty array', () => {
    const result = f.removeDuplicatesFromArray([]);
    assert.deepStrictEqual(result, []);
});

test('should handle single element', () => {
    const result = f.removeDuplicatesFromArray(['x']);
    assert.deepStrictEqual(result, ['x']);
});

// --- converter ---
console.log('\n--- converter ---');

test('should convert object to price/volume arrays', () => {
    const input = { '10.5': 100, '11.0': 200 };
    const result = f.converter(input);
    assert.deepStrictEqual(result.price, [10.5, 11.0]);
    assert.deepStrictEqual(result.volume, [100, 200]);
});

test('should return empty arrays for empty object', () => {
    const result = f.converter({});
    assert.deepStrictEqual(result, { price: [], volume: [] });
});

test('should parse string keys as floats', () => {
    const input = { '0.00012': 50 };
    const result = f.converter(input);
    assert.strictEqual(result.price[0], 0.00012);
});

// --- multipleROIcalculate ---
console.log('\n--- multipleROIcalculate ---');

test('should calculate ROI percentage correctly', () => {
    // max=110, min=100 → 110/100*100 - 100 = 10% (approx due to floating point)
    const roi = f.multipleROIcalculate([100, 105, 110], 'test');
    assert.ok(Math.abs(roi - 10) < 0.001, `Expected ~10, got ${roi}`);
});

test('should handle negative ROI (impossible for ratio)', () => {
    // max=100, min=95 → 100/95*100 - 100 ≈ 5.26%
    const roi = f.multipleROIcalculate([95, 100], 'test');
    assert.ok(roi > 5 && roi < 6, `Expected ~5.26, got ${roi}`);
});

test('should filter out zero values', () => {
    // After filtering: [100, 200] → max=200, min=100 → 100%
    const roi = f.multipleROIcalculate([0, 100, 200], 'test');
    assert.strictEqual(roi, 100);
});

test('should handle single value after filter', () => {
    // After filtering: [50] → max=50, min=50 → 0%
    const roi = f.multipleROIcalculate([50, 0, 0], 'test');
    assert.strictEqual(roi, 0);
});

test('should return -Infinity or NaN for all-zero array (edge case)', () => {
    // After filtering: [] → Math.max() = -Infinity, divide by -Infinity
    const roi = f.multipleROIcalculate([0, 0, 0], 'test');
    // After filtering zeros, array is empty. Max(-Infinity)/Min(Infinity) = -Infinity
    // This is an edge case in the codebase
    assert.ok(!isFinite(roi) || isNaN(roi), `Expected non-finite, got ${roi}`);
});

// --- statusUpdate ---
console.log('\n--- statusUpdate ---');

test('should increment counter and not crash', () => {
    // Just verify it doesn't throw
    f.statusUpdate('test message');
    f.statusUpdate('another message');
});

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exitCode = 1;
