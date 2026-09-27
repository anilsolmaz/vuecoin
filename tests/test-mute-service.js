/**
 * Test Suite: MuteService & TelegramBotService
 * Tests coin muting, unmuting, expiration, recent alert tracking, and interactive menu generation.
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

async function runTests() {
    console.log('\n=== MuteService & TelegramBotService Tests ===\n');

    const MuteService = require('../server/services/MuteService');
    const TelegramBotService = require('../server/services/TelegramBotService');

    await MuteService.init();

    // --- MuteService: parseDuration ---
    console.log('--- MuteService: parseDuration ---');

    test('should parse 1d, 3d, 7d correctly', () => {
        const d1 = MuteService.parseDuration('1d');
        const d3 = MuteService.parseDuration('3d');
        const d7 = MuteService.parseDuration('7d');

        assert.strictEqual(d1, 24 * 60 * 60 * 1000);
        assert.strictEqual(d3, 3 * 24 * 60 * 60 * 1000);
        assert.strictEqual(d7, 7 * 24 * 60 * 60 * 1000);
    });

    test('should parse numeric days and hours', () => {
        assert.strictEqual(MuteService.parseDuration('1'), 24 * 60 * 60 * 1000);
        assert.strictEqual(MuteService.parseDuration(3), 3 * 24 * 60 * 60 * 1000);
        assert.strictEqual(MuteService.parseDuration('12h'), 12 * 60 * 60 * 1000);
    });

    test('should fallback to 1 day for null/unknown', () => {
        assert.strictEqual(MuteService.parseDuration(null), 24 * 60 * 60 * 1000);
        assert.strictEqual(MuteService.parseDuration(''), 24 * 60 * 60 * 1000);
    });

    // --- MuteService: mute / unmute / isMuted ---
    console.log('\n--- MuteService: Muting & Unmuting ---');

    test('should mute a coin and detect it as muted', () => {
        MuteService.muteCoin('h', '1d');
        assert.strictEqual(MuteService.isMuted('h'), true);
        assert.strictEqual(MuteService.isMuted('H'), true); // case-insensitive
        assert.strictEqual(MuteService.isMuted('glmr'), false);
    });

    test('should unmute a coin', () => {
        const unmuted = MuteService.unmuteCoin('h');
        assert.strictEqual(unmuted, true);
        assert.strictEqual(MuteService.isMuted('h'), false);
    });

    test('should return false when unmuting non-muted coin', () => {
        const unmuted = MuteService.unmuteCoin('nonexistent');
        assert.strictEqual(unmuted, false);
    });

    test('should auto-expire muted coins', () => {
        // Manually set an already expired mute
        MuteService.mutedCoins['expired_coin'] = {
            coin: 'expired_coin',
            until: Date.now() - 1000,
            mutedAt: Date.now() - 100000,
            duration: '1d'
        };

        assert.strictEqual(MuteService.isMuted('expired_coin'), false);
        assert.strictEqual(MuteService.mutedCoins['expired_coin'], undefined);
    });

    test('getMutedCoins should return active list with formatted text', () => {
        MuteService.muteCoin('glmr', '3d');
        MuteService.muteCoin('fil', '1d');

        const list = MuteService.getMutedCoins();
        assert.strictEqual(list.length >= 2, true);
        const glmr = list.find(item => item.coin === 'glmr');
        assert.ok(glmr);
        assert.ok(glmr.remainingText.includes('gün') || glmr.remainingText.includes('saat'));

        // Cleanup
        MuteService.unmuteCoin('glmr');
        MuteService.unmuteCoin('fil');
    });

    // --- MuteService: Recent Alerts ---
    console.log('\n--- MuteService: Recent Alerts ---');

    test('should track recent alert coins up to 5 and deduplicate', () => {
        MuteService.recentAlerts = [];

        MuteService.addRecentAlert('btc');
        MuteService.addRecentAlert('eth');
        MuteService.addRecentAlert('sol');
        MuteService.addRecentAlert('h');
        MuteService.addRecentAlert('glmr');
        MuteService.addRecentAlert('fil'); // 6th item, should push btc out

        const recent = MuteService.getRecentAlerts();
        assert.strictEqual(recent.length, 5);
        assert.strictEqual(recent[0], 'FIL'); // latest is first
        assert.strictEqual(recent[1], 'GLMR');
        assert.strictEqual(recent.includes('BTC'), false); // btc pushed out

        // Re-adding eth should move it to front
        MuteService.addRecentAlert('eth');
        const recent2 = MuteService.getRecentAlerts();
        assert.strictEqual(recent2[0], 'ETH');
        assert.strictEqual(recent2.filter(c => c === 'ETH').length, 1);
    });

    // --- TelegramBotService: Menus ---
    console.log('\n--- TelegramBotService: Interactive Menus ---');

    test('getMainMenuContent should return interactive keyboard', () => {
        const { text, replyMarkup } = TelegramBotService.getMainMenuContent();
        assert.ok(text.includes('VueCoin Kontrol Merkezi'));
        assert.ok(replyMarkup.inline_keyboard.length >= 3);
        const allButtons = replyMarkup.inline_keyboard.flat();
        assert.ok(allButtons.some(b => b.callback_data === 'menu:mute'));
        assert.ok(allButtons.some(b => b.callback_data === 'menu:muted'));
        assert.ok(allButtons.some(b => b.callback_data === 'menu:status'));
        assert.ok(allButtons.some(b => b.callback_data === 'menu:settings'));
    });

    test('getMuteMenuContent should suggest recent coins', () => {
        MuteService.recentAlerts = ['H', 'GLMR', 'FIL'];
        const { text, replyMarkup } = TelegramBotService.getMuteMenuContent();
        assert.ok(text.includes('Coin Susturma'));
        const allButtons = replyMarkup.inline_keyboard.flat();
        assert.ok(allButtons.some(b => b.callback_data === 'mute_select:h'));
        assert.ok(allButtons.some(b => b.callback_data === 'mute_select:glmr'));
        assert.ok(allButtons.some(b => b.callback_data === 'mute_select:fil'));
        assert.ok(allButtons.some(b => b.callback_data === 'menu:main'));
    });

    test('getMutedListContent should return muted coins with unmute buttons', () => {
        MuteService.muteCoin('trx', '7d');
        const { text, replyMarkup } = TelegramBotService.getMutedListContent();
        assert.ok(text.includes('TRX'));
        const allButtons = replyMarkup.inline_keyboard.flat();
        assert.ok(allButtons.some(b => b.callback_data === 'unmute:trx'));
        MuteService.unmuteCoin('trx');
    });

    test('getStatusContent should return valid status info', async () => {
        const { text, replyMarkup } = await TelegramBotService.getStatusContent();
        assert.ok(text.includes('VueCoin Platform Durumu'));
        assert.ok(text.includes('Binance'));
        assert.ok(replyMarkup.inline_keyboard.length >= 1);
    });

    test('getSettingsContent should return settings summary', async () => {
        const { text, replyMarkup } = await TelegramBotService.getSettingsContent();
        assert.ok(text.includes('Aktif Arbitraj Ayarları'));
        assert.ok(text.includes('Çapraz Arbitraj'));
        assert.ok(replyMarkup.inline_keyboard.length >= 1);
    });

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
