const axios = require('axios');
const TelegramService = require('./TelegramService');
const config = require('../configs/config.json');

let CoinDataService = null;
function getCoinDataService() {
    if (!CoinDataService) {
        try {
            CoinDataService = require('./CoinDataService');
        } catch (e) {
            CoinDataService = null;
        }
    }
    return CoinDataService;
}

const ListingMonitorService = {
    // State to hold previous data for comparison
    previousState: {
        paribu: {
            markets: [],
            currencies: [],
            tickers: []
        },
        btcturk: {
            currencies: [],
            pairs: []
        }
    },

    isInitialized: false,
    isChecking: false,
    isCheckingBTCTurk: false,

    /**
     * Start the monitoring service
     */
    async init() {
        if (this.isInitialized) return;
        console.log('ListingMonitorService initializing...');

        try {
            await this.checkParibuListings(true); // Initial check to populate state without alerting
            await this.checkBTCTurkListings(true);
            this.isInitialized = true;
            console.log('ListingMonitorService initialized.');
        } catch (error) {
            console.error('Failed to initialize ListingMonitorService:', error.message);
        }
    },

    /**
     * Check for new listings on Paribu
     * @param {boolean} silent - If true, do not send alerts (used for initialization)
     */
    async checkParibuListings(silent = false) {
        if (this.isChecking) return;
        this.isChecking = true;

        try {
            const response = await axios.get(config.exchangeMarkets.paribu.initialsUrl, { timeout: 3000 });
            const payload = response.data.payload;

            if (!payload) return;

            const currentMarkets = Object.keys(payload.markets);
            const currentCurrencies = Object.keys(payload.currencies);
            const currentTickers = Object.keys(payload.fee_matrix);

            // If it's the first run, just save state and return
            if (this.previousState.paribu.markets.length === 0 || silent) {
                this.updateState('paribu', currentMarkets, currentCurrencies, currentTickers);
                if (!silent) {
                    TelegramService.broadcast(`🚀 Paribu Monitor Started\nMarkets: ${currentMarkets.length}\nCurrencies: ${currentCurrencies.length}`);
                }
                return;
            }

            // Detect Changes
            const newMarkets = this.getDifference(currentMarkets, this.previousState.paribu.markets);
            const newCurrencies = this.getDifference(currentCurrencies, this.previousState.paribu.currencies);
            const newTickers = this.getDifference(currentTickers, this.previousState.paribu.tickers);

            const allNewItems = [...new Set([...newMarkets, ...newCurrencies, ...newTickers])]; // Unique new items

            if (allNewItems.length > 0) {
                const newCoins = allNewItems.map(item => item.split('-')[0].toUpperCase());
                const uniqueCoins = [...new Set(newCoins)];

                console.log(`New Paribu Listings Detected: ${uniqueCoins.join(', ')}`);
                const cds = getCoinDataService();

                for (const coin of uniqueCoins) {
                    if (cds && typeof cds.registerCoin === 'function') {
                        cds.registerCoin(coin);
                    }

                    const message =
                        `🚨 **NEW LISTING DETECTED** 🚨\n\n` +
                        `Coin: **${coin}**\n` +
                        `Exchange: **Paribu**\n` +
                        `Time: ${new Date().toLocaleTimeString('tr-TR')}\n\n` +
                        `Markets: ${currentMarkets.length} | Currencies: ${currentCurrencies.length}\n\n` +
                        `[ByBit](https://www.bybit.com/trade/usdt/${coin}USDT) | ` +
                        `[Binance](https://www.binance.com/en/trade/${coin}_USDT) | ` +
                        `[Gate.io](https://www.gate.io/trade/${coin}_USDT)`;

                    await TelegramService.broadcast(message);
                }

                // Update state after alerting
                this.updateState('paribu', currentMarkets, currentCurrencies, currentTickers);
            }

        } catch (error) {
            console.error('Error checking Paribu listings:', error.message);
        } finally {
            this.isChecking = false;
        }
    },

    /**
     * Check for new listings on BTCTurk
     * @param {boolean} silent - If true, do not send alerts (used for initialization)
     */
    async checkBTCTurkListings(silent = false) {
        if (this.isCheckingBTCTurk) return;
        this.isCheckingBTCTurk = true;

        try {
            const url = config.exchangeMarkets?.BTCTurk?.exchangeInfoURL || 'https://api.btcturk.com/api/v2/server/exchangeinfo';
            const response = await axios.get(url, { timeout: 4000 });
            const data = response.data?.data;
            if (!data || !data.currencies) return;

            const currentCurrencies = data.currencies.map(c => c.symbol.toUpperCase());
            const currentPairs = (data.symbols || []).map(s => s.name);

            if (this.previousState.btcturk.currencies.length === 0 || silent) {
                this.previousState.btcturk = {
                    currencies: currentCurrencies,
                    pairs: currentPairs
                };
                return;
            }

            const newCurrencies = this.getDifference(currentCurrencies, this.previousState.btcturk.currencies);
            if (newCurrencies.length > 0) {
                console.log(`New BTCTurk Listings Detected: ${newCurrencies.join(', ')}`);
                const cds = getCoinDataService();

                for (const coin of newCurrencies) {
                    if (cds && typeof cds.registerCoin === 'function') {
                        cds.registerCoin(coin);
                    }

                    const message =
                        `🚨 **NEW LISTING DETECTED** 🚨\n\n` +
                        `Coin: **${coin}**\n` +
                        `Exchange: **BTCTurk**\n` +
                        `Time: ${new Date().toLocaleTimeString('tr-TR')}\n\n` +
                        `Total Currencies: ${currentCurrencies.length}\n\n` +
                        `[BTCTurk](https://www.btcturk.com/pro/kripto-para-fiyatlari/${coin}_TRY) | ` +
                        `[Binance](https://www.binance.com/en/trade/${coin}_USDT) | ` +
                        `[ByBit](https://www.bybit.com/trade/usdt/${coin}USDT) | ` +
                        `[Gate.io](https://www.gate.io/trade/${coin}_USDT)`;

                    await TelegramService.broadcast(message);
                }

                this.previousState.btcturk = {
                    currencies: currentCurrencies,
                    pairs: currentPairs
                };
            }
        } catch (error) {
            console.error('Error checking BTCTurk listings:', error.message);
        } finally {
            this.isCheckingBTCTurk = false;
        }
    },

    updateState(exchange, markets, currencies, tickers) {
        this.previousState[exchange] = {
            markets,
            currencies,
            tickers
        };
    },

    getDifference(arr1, arr2) {
        if (!arr1 || !arr2) return [];
        return arr1.filter(x => !arr2.includes(x));
    }
};

module.exports = ListingMonitorService;
