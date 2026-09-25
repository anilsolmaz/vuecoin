const axios = require("axios");

// Add global axios timeout and User-Agent to prevent indefinite network hangs (Required for Paribu)
axios.interceptors.request.use(config => {
    config.timeout = 10000; 
    config.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VueCoinBot/1.0';
    return config;
});

const fs = require("fs");
const { DateTime } = require("luxon");
const redis = require("redis");
const config = require('../configs/config.json');
const ExchangeMonitorService = require('../services/ExchangeMonitorService');


// Redis.io db bilgileri
// Unified Redis Service
const client = require('../services/RedisService');



async function fetchParibu(resolve, reject, currentTime, requestCount) {
    try {
        const response = await axios.get(config.exchangeMarkets.paribu.tickerUrl);
        let paribuData = response.data;
        let paribuJSON = { market: "paribu" };
        Object.keys(paribuData).forEach(coin => {
            if (coin.toLowerCase().split('_')[1] == 'tl') {
                let coinName = coin.toLowerCase().split('_')[0];
                paribuJSON[coinName] = {
                    price: parseFloat(paribuData[coin]['last']),
                    ask: parseFloat(paribuData[coin]['lowestAsk']),
                    askQty: null,
                    bid: parseFloat(paribuData[coin]['highestBid']),
                    bidQty: null
                };
            }
        });
        client.setex('paribuData', config.cacheDuration, JSON.stringify(paribuJSON));
        ExchangeMonitorService.reportSuccess('paribu');
        return resolve(paribuJSON);
    } catch (error) {
        console.error(currentTime, requestCount, '\x1b[31mParibu refresh failed', error.message);
        ExchangeMonitorService.reportFailure('paribu', error);
        return reject('Paribu refresh failed');
    }
}

async function fetchBinance(resolve, reject, currentTime, requestCount) {
    try {
        let response;
        try {
            response = await axios.get(config.exchangeMarkets.binance.tickerUrl, { timeout: 5000 });
        } catch (e) {
            // Fallback to Binance Vision Public Data API if primary endpoint fails/blocks
            const fallbackUrl = 'https://data-api.binance.vision/api/v3/ticker/bookTicker';
            response = await axios.get(fallbackUrl, { timeout: 5000 });
        }
        let binanceData = response.data;
        let binanceJSON = { market: "binance" };
        const excludedSymbols = [
            'HNTUSDT', 'GALUSDT', 'REEFUSDT', 'BEAMUSDT', 'BALUSDT', 'OMGUSDT',
            'RNDRUSDT', 'WAVESUSDT', 'CLVUSDT', 'RDNTUSDT', 'FTMUSDT', 'MATICUSDT',
            'EOSUSDT', 'MKRUSDT'
        ];

        binanceData.forEach(coin => {
            if (!excludedSymbols.includes(coin.symbol))
                binanceJSON[coin.symbol] = {
                    price: (parseFloat(coin.bidPrice) + parseFloat(coin.askPrice)) / 2,
                    bid: parseFloat(coin.bidPrice),
                    bidQty: parseFloat(coin.bidQty),
                    ask: parseFloat(coin.askPrice),
                    askQty: parseFloat(coin.askQty)
                };
        });
        client.setex('binanceData', config.cacheDuration, JSON.stringify(binanceJSON));
        ExchangeMonitorService.reportSuccess('binance');
        return resolve(binanceJSON);
    } catch (error) {
        console.error(currentTime, requestCount, '\x1b[31mbinance refresh failed', error.message);
        ExchangeMonitorService.reportFailure('binance', error);
        return reject('binance refresh failed');
    }
}

async function fetchBTCTurk(resolve, reject, currentTime, requestCount) {
    try {
        const response = await axios.get(config.exchangeMarkets.BTCTurk.tickerUrl, { timeout: 5000 });
        let BTCTurkData = response.data;
        let BTCTurkJSON = { market: "BTCTurk" };
        BTCTurkData.data.forEach(coin => {
            BTCTurkJSON[coin.pair] = {
                price: parseFloat(coin.last),
                ask: parseFloat(coin.ask),
                askQty: null,
                bid: parseFloat(coin.bid),
                bidQty: null
            };
        });
        client.setex('BTCTurkData', config.cacheDuration, JSON.stringify(BTCTurkJSON));
        ExchangeMonitorService.reportSuccess('btcturk');
        return resolve(BTCTurkJSON);
    } catch (error) {
        console.error(currentTime, requestCount, '\x1b[31mBTCTurk refresh failed', error.message);
        ExchangeMonitorService.reportFailure('btcturk', error);
        return reject('BTCTurk refresh failed');
    }
}

let totalJobsCompleted = 0;
module.exports = {
    statusUpdate: function (message) {
        totalJobsCompleted++;
        console.log(totalJobsCompleted, '/', config.totalJob, message);
    },
    twoArrayDifference: function (arr1, arr2) {
        return arr1.filter(x => !arr2.includes(x)).concat(arr2.filter(x => !arr1.includes(x)));
    },
    differenceOfFirstArray: function (arr1, arr2) {
        return arr1.filter(x => !arr2.includes(x));
    },
    telegramMessage: async function (message) {
        // console.log('Telegram Çağırıldı');
        // Delegating to new TelegramService
        try {
            const TelegramService = require('../services/TelegramService');
            await TelegramService.broadcast(message);
        } catch (error) {
            console.error('Telegram Error:', error.message);
        }
    },
    getParibuInitialData: function () {
        return new Promise((resolve, reject) => {
            client.get('paribuInitialData', async (err, data) => {
                if (err) throw err;
                if (data !== null) {
                    return resolve(data);
                } else {
                    try {
                        const response = await axios.get(config.exchangeMarkets.paribu.initialsUrl);
                        client.setex('paribuInitialData', 3, JSON.stringify(response.data));
                        return resolve(JSON.stringify(response.data));
                    } catch (error) {
                        return reject(error);
                    }
                }
            });
        });
    },
    getParibuCoinList: async function () {
        try {
            const response = await axios.get(config.exchangeMarkets.paribu.initialsUrl);
            return response.data.payload.currencies;
        } catch (error) {
            throw error;
        }
    },
    getBTCTurkCoinList: async function () {
        try {
            const response = await axios.get(config.exchangeMarkets.BTCTurk.exchangeInfoURL);
            return response.data.data.currencies.map(currency => currency.symbol.toLowerCase());
        } catch (error) {
            throw error;
        }
    },
    getBinanceCoinList: async function () {
        try {
            const response = await axios.get(config.exchangeMarkets.binance.initialsUrl);
            // Binance /exchangeInfo returns { symbols: [{ symbol, baseAsset, ... }] }
            return response.data.symbols.map(s => s.baseAsset.toLowerCase());
        } catch (error) {
            throw error;
        }
    },
    getRedisCoinList: async function () {
        try {
            const currentCoins = await new Promise((resolve, reject) => {
                client.lrange('ag', 0, -1, (error, coins) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(coins);
                    }
                });
            });
            return currentCoins;
        } catch (error) {
            throw error;
        }
    },
    updateParibuMarkets: async function () {
        try {
            console.log('Paribu Markets update started');
            const response = await axios.get(config.exchangeMarkets.paribu.tickerUrl);
            let newParibuMarketsData = Object.keys(response.data);
            let newParibuMarkets = [];
            newParibuMarketsData.forEach(coin => {
                newParibuMarkets.push(coin.toLowerCase().split('_')[0]);
            });

            let oldParibuMarkets = config.exchangeMarkets.paribu.markets || [];
            let newListings = this.differenceOfFirstArray(newParibuMarkets, oldParibuMarkets);

            if (newListings.length > 0) {
                console.log('New Paribu Markets Found:', newListings);
                newListings.forEach((data) => {
                    config.exchangeMarkets.paribu.markets.push(data);
                });
                console.log('In-memory config updated with new Paribu markets.');
            }
        } catch (error) {
            console.error('Paribu Markets Update Failed', error.message);
        }
    },
    updateBTCTurkMarkets: async function () {
        try {
            console.log('BTCTurk Markets update started');
            const response = await axios.get(config.exchangeMarkets.BTCTurk.exchangeInfoURL);
            let newBTCTurkMarkets = [];
            response.data.data.currencies.forEach(coin => {
                newBTCTurkMarkets.push(coin.symbol.toLowerCase());
            });

            let oldBTCTurkMarkets = config.exchangeMarkets.BTCTurk.markets || [];
            let newListings = this.differenceOfFirstArray(newBTCTurkMarkets, oldBTCTurkMarkets);

            if (newListings.length > 0) {
                console.log('New BTCTurk Markets Found:', newListings);
                newListings.forEach((data) => {
                    config.exchangeMarkets.BTCTurk.markets.push(data);
                });
                console.log('In-memory config updated with new BTCTurk markets.');
            }
        } catch (error) {
            console.error('BTCTurk Markets Update Failed', error.message);
        }
    },
    updatePRBMarkets: async function () {
        // Deprecated or duplicate of updateParibuMarkets? Keeping logic same but axios
        await this.updateParibuMarkets();
    },
    converter: function (object) {
        let items = { "price": [], "volume": [] };
        for (const [key, value] of Object.entries(object)) {
            items.price.push(parseFloat(key));
            items.volume.push(value);
        } return items;
    },
    updateBinanceData: function (requestCount, force = false) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
        return new Promise((resolve, reject) => {
            const BinanceWebSocketService = require('../services/BinanceWebSocketService');
            if (!force && BinanceWebSocketService.isLive()) {
                const wsData = BinanceWebSocketService.getBinanceJSON();
                client.setex('binanceData', config.cacheDuration, JSON.stringify(wsData));
                return resolve(wsData);
            }
            if (!force) {
                client.get('binanceData', (error, data) => {
                    if (error) {
                        return reject('binance cache failed');
                    } else if (data !== null) {
                        return resolve(JSON.parse(data));
                    } else {
                        fetchBinance(resolve, reject, currentTime, requestCount);
                    }
                });
            } else {
                fetchBinance(resolve, reject, currentTime, requestCount);
            }
        });
    },
    updateParibuData: function (requestCount, force = false) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
        return new Promise((resolve, reject) => {
            if (!force) {
                client.get('paribuData', (error, data) => {
                    if (error) {
                        return reject('paribu cache failed');
                    } else if (data !== null) {
                        return resolve(JSON.parse(data));
                    } else {
                        fetchParibu(resolve, reject, currentTime, requestCount);
                    }
                });
            } else {
                fetchParibu(resolve, reject, currentTime, requestCount);
            }
        });
    },

    updateBTCTurkData: async function (requestCount, force = false) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
        return new Promise((resolve, reject) => {
            if (!force) {
                client.get('BTCTurkData', (error, data) => {
                    if (error) {
                        return reject('BTCTurk cache failed');
                    } else if (data !== null) {
                        return resolve(JSON.parse(data));
                    } else {
                        fetchBTCTurk(resolve, reject, currentTime, requestCount);
                    }
                });
            } else {
                fetchBTCTurk(resolve, reject, currentTime, requestCount);
            }
        });
    },
    multipleROIcalculate: function (priceList, coin) {
        priceList = priceList.filter(Number);
        const price1 = Math.max(...priceList);
        const price2 = Math.min(...priceList);
        return price1 / price2 * 100 - 100;
    },
    removeDuplicatesFromArray: function (arrayList) {
        return [...new Set(arrayList)];
    },
    getBinanceOrderBook: async function (symbol) {
        try {
            // Limit 5 is enough for immediate depth check
            let url = `${config.exchangeMarkets.binance.tickerUrl.replace('ticker/bookTicker', 'depth')}?symbol=${symbol}&limit=5`;
            try {
                const response = await axios.get(url, { timeout: 3000 });
                return response.data;
            } catch (err) {
                // Fallback to Binance Vision
                const fallbackUrl = `https://data-api.binance.vision/api/v3/depth?symbol=${symbol}&limit=5`;
                const response = await axios.get(fallbackUrl, { timeout: 3000 });
                return response.data;
            }
        } catch (error) {
            console.error(`Binance OrderBook Error (${symbol}):`, error.message);
            return null;
        }
    },
    getBTCTurkOrderBook: async function (pairSymbol) {
        try {
            const response = await axios.get(`https://api.btcturk.com/api/v2/orderbook?pairSymbol=${pairSymbol}`, { timeout: 3000 });
            return response.data.data;
        } catch (error) {
            console.error(`BTCTurk OrderBook Error (${pairSymbol}):`, error.message);
            return null;
        }
    },
    getParibuOrderBook: async function (market) {
        try {
            const response = await axios.get(`https://api.paribu.com/orderbook?market=${market}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 3000
            });
            return response.data;
        } catch (error) {
            if (error.response && error.response.status !== 404) {
                console.error(`Paribu OrderBook Error (${market}):`, error.message);
            }
            return null;
        }
    }

};
