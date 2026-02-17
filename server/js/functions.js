const db = require("../db");
const axios = require("axios");
const fs = require("fs");
const { DateTime } = require("luxon");
const redis = require("redis");
const config = require('../configs/config.json');


// Redis.io db bilgileri
const client = redis.createClient({
    "port": process.env.REDIS_PORT,
    "password": process.env.REDIS_PASSWORD,
    "host": process.env.REDIS_HOST
});



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
                    bid: parseFloat(paribuData[coin]['highestBid'])
                };
            }
        });
        client.setex('paribuData', config.cacheDuration, JSON.stringify(paribuJSON));
        return resolve(paribuJSON);
    } catch (error) {
        console.error(currentTime, requestCount, '\x1b[31mParibu refresh failed', error.message);
        return reject('Paribu refresh failed');
    }
}

async function fetchBinance(resolve, reject, currentTime, requestCount) {
    try {
        const response = await axios.get(config.exchangeMarkets.binance.tickerUrl);
        console.log(currentTime, requestCount, 'Binance data refreshed');
        let binanceData = response.data;
        let binanceJSON = { market: "binance" };
        binanceData.forEach(coin => {
            if (coin.symbol != 'HNTUSDT' & coin.symbol != 'GALUSDT' & coin.symbol != 'REEFUSDT' & coin.symbol != 'BEAMUSDT' & coin.symbol != 'BALUSDT' & coin.symbol != 'OMGUSDT' & coin.symbol != 'RNDRUSDT' & coin.symbol != 'WAVESUSDT' & coin.symbol != 'CLVUSDT' & coin.symbol != 'RDNTUSDT' & coin.symbol != 'FTMUSDT' & coin.symbol != 'MATICUSDT' & coin.symbol != 'EOSUSDT' & coin.symbol != 'MKRUSDT')
                binanceJSON[coin.symbol] = {
                    price: (parseFloat(coin.bidPrice) + parseFloat(coin.askPrice)) / 2,
                    bid: parseFloat(coin.bidPrice),
                    ask: parseFloat(coin.askPrice)
                };
        });
        client.setex('binanceData', config.cacheDuration, JSON.stringify(binanceJSON));
        return resolve(binanceJSON);
    } catch (error) {
        console.error(currentTime, requestCount, '\x1b[31mbinance refresh failed', error.message);
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
                bid: parseFloat(coin.bid)
            };
        });
        client.setex('BTCTurkData', config.cacheDuration, JSON.stringify(BTCTurkJSON));
        return resolve(BTCTurkJSON);
    } catch (error) {
        console.error(currentTime, requestCount, '\x1b[31mBTCTurk refresh failed', error.message);
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
        console.log('Telegram Çağırıldı');
        try {
            await axios.post('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN_1 + '/sendMessage', {
                "chat_id": -redacted_chat_id,
                "text": message,
                "parse_mode": "MarkdownV2",
                "disable_web_page_preview": true
            });
            await axios.post('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN_2 + '/sendMessage', {
                "chat_id": -1001558369109,
                "text": message,
                "parse_mode": "MarkdownV2",
                "disable_web_page_preview": true
            });
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
            let oldParibuMarkets = config.exchangeMarkets.paribu.markets;
            newParibuMarketsData.forEach(coin => {
                newParibuMarkets.push(coin.toLowerCase().split('_')[0]);
            });

            let paribuMarketsDifference = this.twoArrayDifference(oldParibuMarkets, newParibuMarkets);
            if (paribuMarketsDifference.length > 0) {
                let filepath = process.cwd() + "/server/configs/config.json";
                fs.readFile(filepath, 'utf8', function readFileCallback(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        let newData = JSON.parse(data);
                        paribuMarketsDifference.forEach((data, key) => {
                            newData.exchangeMarkets.paribu.markets.push(data);
                        });
                        fs.writeFile(filepath, JSON.stringify(newData, null, 2), 'utf8', err => {
                            if (err) throw err;
                        });
                    }
                });
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
            let oldBTCTurkMarkets = config.exchangeMarkets.BTCTurk.markets;
            response.data.data.currencies.forEach(coin => {
                newBTCTurkMarkets.push(coin.symbol.toLowerCase());
            });

            let BTCTurkMarketsDifference = this.twoArrayDifference(oldBTCTurkMarkets, newBTCTurkMarkets);
            if (BTCTurkMarketsDifference.length > 0) {
                let filepath = process.cwd() + "/server/configs/config.json";
                fs.readFile(filepath, 'utf8', function readFileCallback(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        let newData = JSON.parse(data);
                        BTCTurkMarketsDifference.forEach((data, key) => {
                            newData.exchangeMarkets.BTCTurk.markets.push(data);
                        });
                        fs.writeFile(filepath, JSON.stringify(newData, null, 2), 'utf8', err => {
                            if (err) throw err;
                        });
                    }
                });
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
    }

};
