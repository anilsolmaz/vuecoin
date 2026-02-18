const db = require("../db");
const axios = require("axios");
const fs = require("fs");
const { DateTime } = require("luxon");
const redis = require("redis");
const config = require('../configs/config.json');
const ExchangeMonitorService = require('../services/ExchangeMonitorService');


// Redis.io db bilgileri
let client;
if (process.env.NODE_ENV !== 'test') {
    client = redis.createClient({
        "port": process.env.REDIS_PORT,
        "password": process.env.REDIS_PASSWORD,
        "host": process.env.REDIS_HOST
    });
} else {
    client = {
        on: () => { },
        setex: () => { },
        get: () => { },
        quit: () => { }
    };
}



async function fetchParibu(resolve, reject, currentTime, requestCount) {
    try {
        const response = await axios.get(config.exchangeMarkets.paribu.tickerUrl);
        console.log(currentTime, requestCount, 'Paribu data refreshed');
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
        const response = await axios.get(config.exchangeMarkets.binance.tickerUrl);
        console.log(currentTime, requestCount, 'Binance data refreshed');
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
        const response = await axios.get(config.exchangeMarkets.BTCTurk.tickerUrl);
        console.log(currentTime, requestCount, 'BTCTurk data refreshed');
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
            return response.data.payload.currencies;
        } catch (error) {
            throw error;
        }
    },
    getChilizCoinList: async function () {
        try {
            const response = await axios.get(config.exchangeMarkets.chiliz.tickerUrl);
            return response.data.payload.currencies;
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

            let filepath = process.cwd() + "/server/configs/config.json";

            // Read fresh data from disk
            let fileData = fs.readFileSync(filepath, 'utf8');
            let currentConfig = JSON.parse(fileData);
            let oldParibuMarkets = currentConfig.exchangeMarkets.paribu.markets;

            // Only find strictly NEW markets (present in API but not in Config)
            let newListings = this.differenceOfFirstArray(newParibuMarkets, oldParibuMarkets);

            if (newListings.length > 0) {
                console.log('New Paribu Markets Found:', newListings);
                newListings.forEach((data) => {
                    currentConfig.exchangeMarkets.paribu.markets.push(data);
                });

                fs.writeFileSync(filepath, JSON.stringify(currentConfig, null, 2), 'utf8');
                console.log('Config updated with new Paribu markets.');
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

            let filepath = process.cwd() + "/server/configs/config.json";

            // Read fresh data from disk
            let fileData = fs.readFileSync(filepath, 'utf8');
            let currentConfig = JSON.parse(fileData);
            let oldBTCTurkMarkets = currentConfig.exchangeMarkets.BTCTurk.markets;

            // Only find strictly NEW markets
            let newListings = this.differenceOfFirstArray(newBTCTurkMarkets, oldBTCTurkMarkets);

            if (newListings.length > 0) {
                console.log('New BTCTurk Markets Found:', newListings);
                newListings.forEach((data) => {
                    currentConfig.exchangeMarkets.BTCTurk.markets.push(data);
                });

                fs.writeFileSync(filepath, JSON.stringify(currentConfig, null, 2), 'utf8');
                console.log('Config updated with new BTCTurk markets.');
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
            if (!force) {
                client.get('binanceData', (error, data) => {
                    if (error) {
                        console.error(currentTime, requestCount, '\x1b[31mBinance cache failed', error);
                        return reject('binance cache failed');
                    } else if (data !== null) {
                        console.log(currentTime, requestCount, 'Binance data used from cache');
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
                        console.error(currentTime, requestCount, '\x1b[31mParibu cache failed', error);
                        return reject('paribu cache failed');
                    } else if (data !== null) {
                        console.log(currentTime, requestCount, 'Paribu data used from cache');
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
                        console.error(currentTime, requestCount, '\x1b[31mBTCTurk cache failed', error);
                        return reject('BTCTurk cache failed');
                    } else if (data !== null) {
                        console.log(currentTime, requestCount, 'BTCTurk data used from cache');
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
    updateChilizData: function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
        return new Promise((resolve, reject) => {
            client.get('ChilizData', async (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mChiliz cache failed', error);
                    return reject('Chiliz cache failed');
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'Chiliz data used from cache');
                    return resolve(JSON.parse(data));
                } else {
                    try {
                        const response = await axios.get(config.exchangeMarkets.chiliz.tickerUrl);
                        console.log(currentTime, requestCount, 'Chiliz data refreshed');
                        let chilizData = response.data;
                        let chilizJSON = { market: "chiliz" };
                        chilizData.forEach(coin => {
                            chilizJSON[coin.symbol] = (parseFloat(coin.bidPrice) + parseFloat(coin.askPrice)) / 2;
                        });
                        client.setex('chilizData', config.cacheDuration, JSON.stringify(chilizJSON));
                        return resolve(chilizJSON);
                    } catch (error) {
                        console.error(currentTime, requestCount, '\x1b[31mChiliz refresh failed', error.message);
                        return reject('Chiliz refresh failed');
                    }
                }
            });
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
            // Limit 5 is enough for immediate depth check usually, or 10
            const response = await axios.get(`${config.exchangeMarkets.binance.tickerUrl.replace('ticker/bookTicker', 'depth')}?symbol=${symbol}&limit=5`);
            return response.data;
        } catch (error) {
            console.error(`Binance OrderBook Error (${symbol}):`, error.message);
            return null;
        }
    },
    getBTCTurkOrderBook: async function (pairSymbol) {
        try {
            // endpoint: htps://api.btcturk.com/api/v2/orderbook?pairSymbol=BTCTRY
            const response = await axios.get(`https://api.btcturk.com/api/v2/orderbook?pairSymbol=${pairSymbol}`);
            return response.data.data;
        } catch (error) {
            console.error(`BTCTurk OrderBook Error (${pairSymbol}):`, error.message);
            return null;
        }
    },
    getParibuOrderBook: async function (market) {
        try {
            // endpoint: https://api.paribu.com/orderbook?market=btc_tl
            const response = await axios.get(`https://api.paribu.com/orderbook?market=${market}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 3000
            });
            return response.data;
        } catch (error) {
            // Suppress 404s for coins that might not have this endpoint active or valid market names
            if (error.response && error.response.status !== 404) {
                console.error(`Paribu OrderBook Error (${market}):`, error.message);
            }
            return null;
        }
    }

};
