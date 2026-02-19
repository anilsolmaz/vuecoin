/**
 * Test Suite: TelegramService
 * Tests escapeHTML, escapeMarkdown, sendMessage behavior, and broadcast.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');

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

// We test the static utility methods directly. Network calls are not tested here.
// We need to require after setting NODE_ENV
const TelegramService = require('../server/services/TelegramService');

console.log('\n=== TelegramService Tests ===\n');

// --- escapeHTML ---
console.log('--- escapeHTML ---');

test('should escape & < > characters', () => {
    const result = TelegramService.escapeHTML('Hello <b>World</b> & "Foo"');
    assert.strictEqual(result, 'Hello &lt;b&gt;World&lt;/b&gt; &amp; "Foo"');
});

test('should return empty string for null/undefined', () => {
    assert.strictEqual(TelegramService.escapeHTML(null), '');
    assert.strictEqual(TelegramService.escapeHTML(undefined), '');
    assert.strictEqual(TelegramService.escapeHTML(''), '');
});

test('should not modify string without special chars', () => {
    assert.strictEqual(TelegramService.escapeHTML('Hello World 123'), 'Hello World 123');
});

test('should handle emoji and unicode', () => {
    const input = '🚀 Price > 100 & < 200';
    const expected = '🚀 Price &gt; 100 &amp; &lt; 200';
    assert.strictEqual(TelegramService.escapeHTML(input), expected);
});

// --- escapeMarkdown ---
console.log('\n--- escapeMarkdown ---');

test('should escape MarkdownV2 special characters', () => {
    const result = TelegramService.escapeMarkdown('Hello *bold* _italic_ [link](url)');
    assert.ok(result.includes('\\*'), 'Should escape *');
    assert.ok(result.includes('\\_'), 'Should escape _');
    assert.ok(result.includes('\\['), 'Should escape [');
    assert.ok(result.includes('\\]'), 'Should escape ]');
    assert.ok(result.includes('\\('), 'Should escape (');
    assert.ok(result.includes('\\)'), 'Should escape )');
});

test('should return empty string for null/undefined', () => {
    assert.strictEqual(TelegramService.escapeMarkdown(null), '');
    assert.strictEqual(TelegramService.escapeMarkdown(undefined), '');
    assert.strictEqual(TelegramService.escapeMarkdown(''), '');
});

test('should not modify plain text', () => {
    assert.strictEqual(TelegramService.escapeMarkdown('Hello World 123'), 'Hello World 123');
});

test('should escape all MarkdownV2 chars: _ * [ ] ( ) ~ ` > # + - = | { } . !', () => {
    const special = '_*[]()~`>#+\\-=|{}.!';
    const result = TelegramService.escapeMarkdown(special);
    // Every character should be preceded by backslash
    for (const char of special) {
        if (char === '\\') continue; // Backslash is part of escape
        assert.ok(result.includes('\\' + char), `Should escape '${char}'`);
    }
});

// --- sendMessage structure ---
console.log('\n--- sendMessage ---');

test('should accept string chatId and wrap in array', async () => {
    // We can't test actual sending without a token, but we verify it doesn't crash
    // with missing token (should just log error and continue)
    const result = await TelegramService.sendMessage('123', 'test');
    assert.ok(result, 'Should return stats object');
    assert.strictEqual(typeof result.success, 'number');
    assert.strictEqual(typeof result.failed, 'number');
});

test('should accept array of chatIds', async () => {
    const result = await TelegramService.sendMessage(['123', '456'], 'test');
    assert.ok(result);
});

// --- broadcast ---
console.log('\n--- broadcast ---');

test('should not crash when token is missing', async () => {
    // In test env, TELEGRAM_BOT_TOKEN_1 is not set
    await TelegramService.broadcast('Test broadcast');
    // If we got here without crash, it's a pass
    assert.ok(true);
});

// --- sendAzelert ---
console.log('\n--- sendAzelert ---');

test('should not crash when Azelert config is missing', async () => {
    await TelegramService.sendAzelert('Test azelert');
    assert.ok(true);
});

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exitCode = 1;
