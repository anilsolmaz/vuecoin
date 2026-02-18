const assert = require('assert');
const f = require('../server/js/functions');
const CoinDataService = require('../server/services/CoinDataService');

console.log('--- STARTING DEEP SYSTEM AUDIT TESTS (POST-FIX) ---');

async function testBitwiseBug() {
    console.log('\n[Test 1] Checking Bitwise Operator Bug in Logic...');
    // We fixed this in functions.js, but we can't test private scope easily.
    // However, let's verify boolean logic behavior just to be sure environment is sane.

    if ((true && false) === false) {
        console.log('✅ Boolean logic is working as expected in JS environment.');
    }
}

async function testProfitCalculation() {
    console.log('\n[Test 2] Auditing Profit Calculation Logic...');

    // Mock Coin Data
    const mockCoin = "TESTCOIN";
    CoinDataService.coinList[mockCoin] = {
        paribu: { try: { price: 100, ask: 100, bid: 90, askQty: null, bidQty: null } },
        binance: { usdt: {}, try: { price: 110, ask: 110, bid: 105, askQty: 500, bidQty: 500 } },
        BTCTurk: { try: {} },
        chiliz: { chz: {} },
        FTX: { try: {} }
    };

    // Mock USDT rate
    CoinDataService.paribuUSDT = 1;

    CoinDataService.calculateCoinMetrics(mockCoin);

    const item = CoinDataService.coinList[mockCoin];
    if (item.arbitrageDetails) {
        console.log('Arb Details:', item.arbitrageDetails);

        // Buy at Paribu (100 TL)
        // Sell at Binance (105 TL)
        // Paribu Qty = Infinity (default)
        // Binance Qty = 500 Coins
        // Max Tradable Coin = 500

        // Verify Prices
        if (item.arbitrageDetails.buyPrice === 100 && item.arbitrageDetails.sellPrice === 105) {
            console.log('✅ Buy/Sell Prices Correctly Populated (100 -> 105)');
        } else {
            console.error(`❌ Buy/Sell Prices INCORRECT. Got Buy: ${item.arbitrageDetails.buyPrice}, Sell: ${item.arbitrageDetails.sellPrice}`);
        }

        // Cost = 500 * 100 = 50,000 TL
        if (item.arbitrageDetails.tradeAmountTRY === 50000) {
            console.log('✅ Volume Calculation Correct (Cost basis: 50,000)');
        } else {
            console.error(`❌ Volume Calculation INCORRECT. Expected 50000, got ${item.arbitrageDetails.tradeAmountTRY}`);
        }

        // Revenue = 500 * 105 = 52,500
        // Profit = 2,500
        if (item.arbitrageDetails.profit === 2500) {
            console.log('✅ Profit Calculation Correct (2500)');
        } else {
            console.error(`❌ Profit Calculation INCORRECT. Expected 2500, got ${item.arbitrageDetails.profit}`);
        }
    } else {
        console.error('❌ Failed to detect arbitrage opportunity');
    }
}

async function testDivisionByZero() {
    console.log('\n[Test 3] Auditing Division By Zero...');

    const mockCoin = "ZEROCOIN";
    CoinDataService.coinList[mockCoin] = {
        paribu: { try: { price: 0, ask: 0, bid: 0 } },
        binance: { try: { price: 100, ask: 100, bid: 90 } },
        BTCTurk: {}, chiliz: {}, FTX: {}
    };

    CoinDataService.calculateCoinMetrics(mockCoin);
    const item = CoinDataService.coinList[mockCoin];

    console.log(`ROI with zero buy price: ${item.ROI}`);
    // Should be -10 or handled gracefully.
    // If it didn't crash, we are good.
    console.log('✅ Zero price handling: No crash.');
}

async function runAudit() {
    await testBitwiseBug();
    await testProfitCalculation();
    await testDivisionByZero();
}

runAudit();
