const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const CoinDataService = require('../server/services/CoinDataService');
const client = require('../server/services/RedisService');
const TelegramService = require('../server/services/TelegramService');

// Mock Telegram Broadcast ONLY
TelegramService.broadcast = async (msg) => {
    console.log('\n📨 [MOCK TELEGRAM SENT]');
    console.log(msg);
    console.log('-----------------------------------');
    return { success: 1, failed: 0 };
};

async function debugTopDeals() {
    console.log('🔍 --- DEBUGGING TELEGRAM ALERTS --- 🔍');

    // 1. CHECK SETTINGS
    console.log('\n📡 STEP 1: Checking Redis Settings...');
    const getSettings = () => new Promise(resolve => {
        client.get('arb_settings', (err, reply) => {
            if (err) resolve(null); // Ignore error
            resolve(reply ? JSON.parse(reply) : null);
        });
    });

    const redisSettings = await Promise.race([
        getSettings(),
        new Promise(r => setTimeout(() => r(null), 1500))
    ]);

    if (redisSettings) {
        console.log('✅ Settings found in Redis:', redisSettings);
    } else {
        console.warn('⚠️  Settings not found or Redis busy (Using Defaults).');
    }

    // 2. FETCH DATA
    console.log('\n🌍 STEP 2: Fetching Real Market Data...');
    const start = Date.now();
    try {
        await CoinDataService.refreshAllData();
    } catch (e) {
        // console.error("Fetch Data Error:", e.message);
    }
    const duration = (Date.now() - start) / 1000;

    const coinCount = Object.keys(CoinDataService.coinList).length;
    console.log(`✅ Process finished in ${duration.toFixed(2)}s`);
    console.log(`📊 Total Coins Scanned: ${coinCount}`);

    if (coinCount === 0) {
        console.error('❌ FATAL: No coins found. API Fetch likely blocked or failed.');
    }

    // 3. ANALYZE
    let opportunities = [];
    Object.keys(CoinDataService.coinList).forEach(key => {
        if (CoinDataService.coinList[key].arbitrageDetails) {
            opportunities.push({
                coin: key,
                ...CoinDataService.coinList[key].arbitrageDetails
            });
        }
    });

    opportunities.sort((a, b) => b.profit - a.profit);
    const top3 = opportunities.slice(0, 3);

    console.log('\n🏆 STEP 3: TOP 3 DEALS (RAW - NO FILTERS)');
    console.log('--------------------------------------------------');

    if (top3.length === 0) {
        console.log('❌ No arbitrage opportunities detected.');
    } else {
        top3.forEach((op, i) => {
            console.log(`#${i + 1} [${op.coin.toUpperCase()}]`);
            console.log(`   💰 Profit: ₺${op.profit.toFixed(2)}`);
            console.log(`   📈 ROI: %${op.roi.toFixed(2)}`);
            console.log(`   🛒 Buy: ${op.buyExchange} (@ ₺${op.buyPrice.toFixed(2)})`);
            console.log(`   🤝 Sell: ${op.sellExchange} (@ ₺${op.sellPrice.toFixed(2)})`);

            const appliedSettings = redisSettings || CoinDataService.settings;
            const minROI = appliedSettings.minROI || 0.50;
            const minProfit = appliedSettings.minProfit || 1000;

            let failures = [];
            if (op.roi < minROI) failures.push(`ROI < ${minROI}`);
            if (op.profit < minProfit) failures.push(`Profit < ₺${minProfit}`);

            console.log(`   📝 Status: ${failures.length > 0 ? '❌ BLOCKED' : '✅ SENDING'}`);
            if (failures.length > 0) console.log(`      Reason: ${failures.join(', ')}`);
            else {
                // Try checkAndSendTelegramAlert to see internal logic
                CoinDataService.checkAndSendTelegramAlert(op).catch(e => console.error(e));
            }
            console.log('--------------------------------------------------');
        });
    }

    try { client.quit(); } catch (e) { }
    setTimeout(() => process.exit(0), 1000);
}

debugTopDeals();
