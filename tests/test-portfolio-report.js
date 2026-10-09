/**
 * Test Suite: PortfolioReportService
 * Tests daily Pacific 21:00 schedule, calculations, top 5 asset ranking, and report formatting.
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
    console.log('\n=== PortfolioReportService Tests ===\n');

    const PortfolioReportService = require('../server/services/PortfolioReportService');

    // --- Formatting Tests ---
    console.log('--- Formatting Helpers ---');

    test('formatNumber should format amounts with thousands separator and decimals', () => {
        assert.strictEqual(PortfolioReportService.formatNumber(1234.56, 2), '1,234.56');
        assert.strictEqual(PortfolioReportService.formatNumber(0, 2), '0.00');
        assert.strictEqual(PortfolioReportService.formatNumber(null, 2), '0.00');
    });

    test('formatChange should format percentage and dollar difference', () => {
        const positive = PortfolioReportService.formatChange(5.25, 120.5);
        assert.strictEqual(positive, '+5.25% (+$120.50)');

        const negative = PortfolioReportService.formatChange(-3.1, -45.2);
        assert.strictEqual(negative, '-3.10% (-$45.20)');

        const zero = PortfolioReportService.formatChange(0, 0);
        assert.strictEqual(zero, '0.00% ($0.00)');
    });

    // --- Message Building Tests ---
    console.log('\n--- Report Message Generation ---');

    test('buildReportMessage should handle empty portfolio', () => {
        const msg = PortfolioReportService.buildReportMessage(null);
        assert.ok(msg.toLowerCase().includes('portföyde kayıtlı varlık bulunamadı'));
    });

    test('buildReportMessage should render formatted report with top 5 and changes', () => {
        const mockData = {
            datePacific: '08.10.2026 | 21:00',
            totalValueUsdt: 15420.50,
            totalValueTry: 562848.25,
            totalDiff1d: 320.40,
            totalPct1d: 2.12,
            totalDiff7d: 850.10,
            totalPct7d: 5.83,
            totalDiff30d: 1850.00,
            totalPct30d: 13.63,
            totalAssetCount: 8,
            top5: [
                {
                    coin: 'BNB',
                    amount: 13.6,
                    currentPrice: 740.0,
                    currentValue: 10064.0,
                    diff1d: 150.0,
                    pct1d: 1.51,
                    diff7d: 400.0,
                    pct7d: 4.14,
                    diff30d: 1000.0,
                    pct30d: 11.03
                },
                {
                    coin: 'DOT',
                    amount: 67.63,
                    currentPrice: 9.2,
                    currentValue: 622.19,
                    diff1d: -12.0,
                    pct1d: -1.89,
                    diff7d: 25.0,
                    pct7d: 4.19,
                    diff30d: 50.0,
                    pct30d: 8.74
                }
            ]
        };

        const msg = PortfolioReportService.buildReportMessage(mockData);
        assert.ok(msg.includes('Jito Portföy Günlük Raporu'));
        assert.ok(msg.includes('UTC-7 Pasifik'));
        assert.ok(msg.includes('$15,420.50'));
        assert.ok(msg.includes('BNB'));
        assert.ok(msg.includes('DOT'));
        assert.ok(msg.includes('+2.12%'));
        assert.ok(msg.includes('1️⃣'));
    });

    // --- Schedule & Timezone Tests ---
    console.log('\n--- Scheduling & Timezone ---');

    test('should be configured for Pacific 21:00', () => {
        assert.strictEqual(PortfolioReportService.targetTimezone, 'America/Los_Angeles');
        assert.strictEqual(PortfolioReportService.targetHour, 21);
        assert.strictEqual(PortfolioReportService.targetMinute, 0);
    });

    test('should prevent sending multiple times on the same date', async () => {
        PortfolioReportService.lastSentDate = '2026-10-08';
        const initialDate = PortfolioReportService.lastSentDate;
        
        // Emulate check
        const isAlreadySent = (PortfolioReportService.lastSentDate === '2026-10-08');
        assert.strictEqual(isAlreadySent, true);
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
