const axios = require('axios');
const TelegramService = require('./TelegramService');
const config = require('../configs/config.json');

const ListingMonitorService = {
    // State to hold previous data for comparison
    previousState: {
        paribu: {
            markets: [],
            currencies: [],
            tickers: []
        }
    },

    isInitialized: false,

    /**
     * Start the monitoring service
     */
    async init() {
        if (this.isInitialized) return;
        console.log('ListingMonitorService initializing...');

        try {
            await this.checkParibuListings(true); // Initial check to populate state without alerting
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
        try {
            const response = await axios.get(config.exchangeMarkets.paribu.initialsUrl, { timeout: 1500 });
            const payload = response.data.payload;

            if (!payload) return;

            const currentMarkets = Object.keys(payload.markets);
            const currentCurrencies = Object.keys(payload.currencies);
            const currentTickers = Object.keys(payload.fee_matrix);

            // If it's the first run, just save state and return
            if (this.previousState.paribu.markets.length === 0 || silent) {
                this.updateState('paribu', currentMarkets, currentCurrencies, currentTickers);
                if (!silent) {
                    TelegramService.broadcast(`🚀 Monitor Started\nMarkets: ${currentMarkets.length}\nCurrencies: ${currentCurrencies.length}`);
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

                console.log(`New Listings Detected: ${uniqueCoins.join(', ')}`);

                for (const coin of uniqueCoins) {
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
