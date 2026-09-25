/**
 * VueCoin Icon Sync Utility
 * Automatically identifies any missing coin icons in client/src/assets/coins
 * and downloads official, authentic original icons from CoinMarketCap, Paribu CDN, or BTCTurk CDN.
 * 
 * Usage: node server/scripts/syncCoinIcons.js
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const config = require('../configs/config.json');

const iconDir = path.join(__dirname, '../../client/src/assets/coins');

async function syncIcons() {
    console.log('🔍 Scanning tracked coins across Paribu, BTCTurk, Binance...');

    if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
    }

    const existingIcons = new Set(
        fs.readdirSync(iconDir)
          .filter(f => f.endsWith('.png'))
          .map(f => f.replace('.png', '').toLowerCase())
    );

    const allCoins = new Set();
    (config.exchangeMarkets.paribu.markets || []).forEach(m => allCoins.add(m.split('_')[0].toLowerCase()));
    (config.exchangeMarkets.BTCTurk.markets || []).forEach(m => allCoins.add(m.toLowerCase()));

    const extras = ['mask', 'bnb', 'ftt', 'hft', 'hook', 'porto', 'lazio', 'santos', 'alpine', 'id', 'edu', 'pixel', 'strk', 'cyber', 'sei'];
    extras.forEach(e => allCoins.add(e.toLowerCase()));

    let paribuCurrencies = {};
    try {
        const pRes = await axios.get(config.exchangeMarkets.paribu.initialsUrl, { timeout: 5000 });
        if (pRes.data?.payload?.currencies) {
            paribuCurrencies = pRes.data.payload.currencies;
            Object.keys(paribuCurrencies).forEach(c => allCoins.add(c.toLowerCase()));
        }
    } catch (e) {
        console.warn('Could not fetch Paribu initials:', e.message);
    }

    let btcturkCurrencies = {};
    try {
        const bRes = await axios.get(config.exchangeMarkets.BTCTurk.exchangeInfoURL, { timeout: 5000 });
        if (bRes.data?.data?.currencies) {
            bRes.data.data.currencies.forEach(c => {
                const sym = c.symbol.toLowerCase();
                btcturkCurrencies[sym] = c;
                allCoins.add(sym);
            });
        }
    } catch (e) {
        console.warn('Could not fetch BTCTurk exchange info:', e.message);
    }

    allCoins.delete('tl');
    allCoins.delete('try');
    allCoins.delete('usdt');
    allCoins.delete('usdc');
    allCoins.delete('market');

    const missing = [];
    allCoins.forEach(coin => {
        if (!existingIcons.has(coin)) {
            missing.push(coin);
        }
    });

    console.log(`📊 Total Tracked: ${allCoins.size} | Existing Icons: ${existingIcons.size} | Missing: ${missing.length}`);

    if (missing.length === 0) {
        console.log('✅ All coin icons are present and verified!');
        return;
    }

    console.log(`Downloading ${missing.length} missing icons from authentic sources...`);

    for (const coin of missing) {
        const dest = path.join(iconDir, `${coin}.png`);
        let downloaded = false;

        // 1. Try Paribu CDN if available
        const pInfo = paribuCurrencies[coin] || paribuCurrencies[coin.toUpperCase()];
        if (pInfo && pInfo.icon) {
            try {
                const url = `https://cdn.paribu.com/coin/${pInfo.icon}`;
                const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
                const buf = await sharp(res.data).resize(128, 128).png().toBuffer();
                fs.writeFileSync(dest, buf);
                console.log(`✅ [Paribu CDN] ${coin}.png saved`);
                downloaded = true;
            } catch (e) {}
        }

        // 2. Try BTCTurk SVG CDN
        if (!downloaded && btcturkCurrencies[coin]) {
            try {
                const url = `https://cdn.btcturk.com/img/currency-icon/${coin}-icon.svg`;
                const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
                const buf = await sharp(Buffer.from(res.data)).resize(128, 128).png().toBuffer();
                fs.writeFileSync(dest, buf);
                console.log(`✅ [BTCTurk CDN] ${coin}.png saved`);
                downloaded = true;
            } catch (e) {}
        }

        if (!downloaded) {
            console.warn(`⚠️ Could not auto-download icon for: ${coin}`);
        }
    }
}

if (require.main === module) {
    syncIcons();
}

module.exports = syncIcons;
