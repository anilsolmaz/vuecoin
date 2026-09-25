const axios = require('axios');
const config = require('../configs/config.json');

/**
 * ExchangePrecisionService
 * Fetches and dynamically manages price decimal precision (fraction digits / tick size)
 * from Paribu, BTCTurk, and Binance.
 * 
 * Runs on startup and periodically (default: every 1 hour) to keep precisions synchronized
 * with exchange updates.
 */
class ExchangePrecisionService {
    constructor() {
        this.precisionMap = {}; // coin -> { fraction, precisions: { paribu, btcturk, binance } }
        this.lastUpdated = null;
        this.updateIntervalMs = 60 * 60 * 1000; // 1 hour
        this.timer = null;
        this.isUpdating = false;

        // Exchange endpoints with reliable fallbacks
        this.paribuUrl = config.exchangeMarkets?.paribu?.initialsUrl || 'https://web.paribu.com/initials/config';
        this.paribuFallbackUrl = 'https://v3.paribu.com/app/initials';
        this.btcturkUrl = config.exchangeMarkets?.BTCTurk?.exchangeInfoURL || 'https://api.btcturk.com/api/v2/server/exchangeinfo';
        this.binanceUrl = 'https://data-api.binance.vision/api/v3/exchangeInfo';
        this.binanceFallbackUrl = config.exchangeMarkets?.binance?.initialsUrl || 'https://api.binance.com/api/v3/exchangeInfo';
    }

    /**
     * Converts a string tickSize (e.g. '0.01000000', '0.00000001', '1.00000000') to decimal precision.
     */
    tickSizeToPrecision(tickSize) {
        if (!tickSize) return 4;
        const num = parseFloat(tickSize);
        if (isNaN(num) || num <= 0) return 4;
        if (num >= 1) return 0;
        const s = tickSize.toString().replace(/0+$/, '');
        const dotIndex = s.indexOf('.');
        if (dotIndex === -1) return 0;
        return s.length - dotIndex - 1;
    }

    /**
     * Fetch Paribu precisions from initials config
     */
    async fetchParibuPrecisions() {
        const fetchUrl = async (url) => {
            const res = await axios.get(url, {
                timeout: 6000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            return res.data?.payload?.markets;
        };

        let markets = null;
        try {
            markets = await fetchUrl(this.paribuUrl);
        } catch (e) {
            try {
                markets = await fetchUrl(this.paribuFallbackUrl);
            } catch (err2) {
                console.warn(`[ExchangePrecisionService] Failed to fetch Paribu precisions: ${err2.message}`);
                return {};
            }
        }

        if (!markets) return {};

        const result = {};
        for (const [key, market] of Object.entries(markets)) {
            const parts = key.split('_');
            let coin = parts[0]?.toLowerCase();
            if (!coin) continue;
            if (coin === 'miota') coin = 'iota';
            const quote = (parts[1] === 'tl' || parts[1] === 'try') ? 'try' : 'usdt';

            if (!result[coin]) result[coin] = {};
            if (market?.precisions?.price !== undefined) {
                result[coin][quote] = parseInt(market.precisions.price);
            }
        }
        return result;
    }

    /**
     * Fetch BTCTurk precisions from server/exchangeinfo
     */
    async fetchBTCTurkPrecisions() {
        try {
            const res = await axios.get(this.btcturkUrl, { timeout: 6000 });
            const symbols = res.data?.data?.symbols;
            if (!Array.isArray(symbols)) return {};

            const result = {};
            for (const s of symbols) {
                if (!s.numerator || !s.denominator) continue;
                const coin = s.numerator.toLowerCase();
                const quote = s.denominator.toLowerCase();
                if (quote !== 'try' && quote !== 'usdt') continue;

                if (!result[coin]) result[coin] = {};
                if (s.denominatorScale !== undefined && s.denominatorScale !== null) {
                    result[coin][quote] = parseInt(s.denominatorScale);
                } else if (s.displayFormat) {
                    const parts = s.displayFormat.split('.');
                    result[coin][quote] = parts[1] ? parts[1].length : 0;
                }
            }
            return result;
        } catch (e) {
            console.warn(`[ExchangePrecisionService] Failed to fetch BTCTurk precisions: ${e.message}`);
            return {};
        }
    }

    /**
     * Fetch Binance precisions from exchangeInfo
     */
    async fetchBinancePrecisions() {
        const fetchUrl = async (url) => {
            const res = await axios.get(url, {
                timeout: 8000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            return res.data?.symbols;
        };

        let symbols = null;
        try {
            symbols = await fetchUrl(this.binanceUrl);
        } catch (e) {
            try {
                symbols = await fetchUrl(this.binanceFallbackUrl);
            } catch (err2) {
                console.warn(`[ExchangePrecisionService] Failed to fetch Binance precisions: ${err2.message}`);
                return {};
            }
        }

        if (!Array.isArray(symbols)) return {};

        const result = {};
        for (const s of symbols) {
            if (!s.baseAsset || !s.quoteAsset) continue;
            const coin = s.baseAsset.toLowerCase();
            const quote = s.quoteAsset.toLowerCase();
            if (quote !== 'usdt' && quote !== 'try') continue;

            const priceFilter = s.filters?.find(f => f.filterType === 'PRICE_FILTER');
            if (priceFilter && priceFilter.tickSize) {
                if (!result[coin]) result[coin] = {};
                result[coin][quote] = this.tickSizeToPrecision(priceFilter.tickSize);
            }
        }
        return result;
    }

    /**
     * Calculates the best representative default fraction for a coin.
     */
    computeOptimalFraction(precisions) {
        if (!precisions) return 4;
        if (precisions.paribu?.try !== undefined) return precisions.paribu.try;
        if (precisions.btcturk?.try !== undefined) return precisions.btcturk.try;
        if (precisions.binance?.usdt !== undefined) return precisions.binance.usdt;
        if (precisions.binance?.try !== undefined) return precisions.binance.try;
        if (precisions.paribu?.usdt !== undefined) return precisions.paribu.usdt;
        if (precisions.btcturk?.usdt !== undefined) return precisions.btcturk.usdt;
        return 4;
    }

    /**
     * Updates precision data across all 3 exchanges concurrently and updates active coins.
     */
    async updatePrecisions() {
        if (this.isUpdating) return;
        this.isUpdating = true;

        try {
            const [pRes, btcRes, binRes] = await Promise.allSettled([
                this.fetchParibuPrecisions(),
                this.fetchBTCTurkPrecisions(),
                this.fetchBinancePrecisions()
            ]);

            const paribuMap = pRes.status === 'fulfilled' ? pRes.value : {};
            const btcturkMap = btcRes.status === 'fulfilled' ? btcRes.value : {};
            const binanceMap = binRes.status === 'fulfilled' ? binRes.value : {};

            const paribuCount = Object.keys(paribuMap).length;
            const btcturkCount = Object.keys(btcturkMap).length;
            const binanceCount = Object.keys(binanceMap).length;

            const allCoins = new Set([
                ...Object.keys(this.precisionMap),
                ...Object.keys(paribuMap),
                ...Object.keys(btcturkMap),
                ...Object.keys(binanceMap)
            ]);

            for (const coin of allCoins) {
                const existing = this.precisionMap[coin]?.precisions || {};
                const mergedPrecisions = {
                    paribu: { ...(existing.paribu || {}), ...(paribuMap[coin] || {}) },
                    btcturk: { ...(existing.btcturk || {}), ...(btcturkMap[coin] || {}) },
                    binance: { ...(existing.binance || {}), ...(binanceMap[coin] || {}) }
                };

                const fraction = this.computeOptimalFraction(mergedPrecisions);
                this.precisionMap[coin] = {
                    fraction,
                    precisions: mergedPrecisions
                };
            }

            this.lastUpdated = new Date();
            console.log(`[ExchangePrecisionService] 🎯 Updated precisions for ${Object.keys(this.precisionMap).length} coins ` +
                `(Paribu: ${paribuCount}, BTCTurk: ${btcturkCount}, Binance: ${binanceCount})`);

            // Apply to active CoinDataService if initialized
            this.applyToActiveCoinData();

            return {
                totalCoins: Object.keys(this.precisionMap).length,
                paribuCount,
                btcturkCount,
                binanceCount,
                timestamp: this.lastUpdated
            };
        } catch (e) {
            console.error('[ExchangePrecisionService] Error during update:', e.message);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Applies current precision settings to active in-memory CoinDataService
     */
    applyToActiveCoinData() {
        try {
            const CoinDataService = require('./CoinDataService');
            if (CoinDataService && CoinDataService.coinList) {
                this.applyToCoinList(CoinDataService.coinList);
            }
        } catch (e) {
            // Silently ignore if CoinDataService not available
        }
    }

    /**
     * Applies current precisions to any given coinList object
     */
    applyToCoinList(coinList) {
        if (!coinList || typeof coinList !== 'object') return;
        for (const [key, item] of Object.entries(coinList)) {
            if (!item || typeof item !== 'object') continue;
            const prec = this.getPrecisionForCoin(key);
            item.fraction = prec.fraction;
            item.precisions = prec.precisions;
        }
    }

    /**
     * Gets precision definition for a specific coin.
     * Guaranteed to return an object { fraction: number, precisions: { paribu, btcturk, binance } }.
     */
    getPrecisionForCoin(coinSymbol) {
        if (!coinSymbol) {
            return { fraction: 4, precisions: { paribu: {}, btcturk: {}, binance: {} } };
        }
        const clean = coinSymbol.toLowerCase().trim();
        if (this.precisionMap[clean]) {
            return this.precisionMap[clean];
        }

        // Sensible default fallback based on common asset profile
        let fraction = 4;
        if (clean === 'btc' || clean === 'eth') fraction = 0;
        else if (['pepe', 'shib', 'floki', 'bonk', 'wif', 'btt', 'lunc', '1000sats', '1000pepe', '1000cat'].some(s => clean.includes(s))) fraction = 8;
        else if (['sol', 'bnb', 'avax', 'link', 'ltc', 'aave', 'near'].includes(clean)) fraction = 2;
        else if (['xrp', 'ada', 'trx', 'doge', 'chz'].includes(clean)) fraction = 4;

        return {
            fraction,
            precisions: {
                paribu: {},
                btcturk: {},
                binance: {}
            }
        };
    }

    /**
     * Starts the periodic update job (hourly by default)
     */
    async start(intervalMs = null) {
        if (intervalMs) this.updateIntervalMs = intervalMs;
        // Perform initial update immediately
        await this.updatePrecisions();

        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.updatePrecisions();
        }, this.updateIntervalMs);

        console.log(`[ExchangePrecisionService] ⏱️ Periodic precision monitor active (every ${this.updateIntervalMs / 60000} minutes)`);
    }

    /**
     * Stops the periodic update timer
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

module.exports = new ExchangePrecisionService();
