const db = require("../db");
const request = require("request")
const fs = require("fs");
const { DateTime } = require("luxon");
let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
const redis = require("redis");
const config = require('../configs/config.json');


// Redis.io db bilgileri
const client = redis.createClient({
    "port": 14973,
    "password": "ftjMfc4hlNzT1Q4WsR6rumb9ZFVLlvMw",
    "host": "redis-14973.c293.eu-central-1-1.ec2.cloud.redislabs.com"
});



function fetchParibu(resolve, reject, currentTime, requestCount) {
    request(config.exchangeMarkets.paribu.tickerUrl, function (error, response) {
        if (error) {
            console.error(currentTime, requestCount, '\x1b[31mParibu refresh failed', error)
            return reject('Paribu refresh failed')
        }
        console.log(currentTime, requestCount, 'Paribu data refreshed')
        let paribuData = JSON.parse(response.body)
        let paribuJSON = { market: "paribu" }
        Object.keys(paribuData).forEach(coin => {
            if (coin.toLowerCase().split('_')[1] == 'tl') {
                let coinName = coin.toLowerCase().split('_')[0]
                paribuJSON[coinName] = {
                    price: parseFloat(paribuData[coin]['last']),
                    ask: parseFloat(paribuData[coin]['lowestAsk']),
                    bid: parseFloat(paribuData[coin]['highestBid'])
                }
            }
        })
        client.setex('paribuData', config.cacheDuration, JSON.stringify(paribuJSON));
        return resolve(paribuJSON)
    })
}

function fetchBinance(resolve, reject, currentTime, requestCount) {
    request(config.exchangeMarkets.binance.tickerUrl, function (error, response) {
        if (error) {
            console.error(currentTime, requestCount, '\x1b[31mbinance refresh failed', error)
            return reject('binance refresh failed')
        }
        console.log(currentTime, requestCount, 'Binance data refreshed')
        let binanceData = JSON.parse(response.body)
        let binanceJSON = { market: "binance" }
        binanceData.forEach(coin => {
            // Filter logic remains the same
            if (coin.symbol != 'HNTUSDT' & coin.symbol != 'GALUSDT' & coin.symbol != 'REEFUSDT' & coin.symbol != 'BEAMUSDT' & coin.symbol != 'BALUSDT' & coin.symbol != 'OMGUSDT' & coin.symbol != 'RNDRUSDT' & coin.symbol != 'WAVESUSDT' & coin.symbol != 'CLVUSDT' & coin.symbol != 'RDNTUSDT' & coin.symbol != 'FTMUSDT' & coin.symbol != 'MATICUSDT' & coin.symbol != 'EOSUSDT' & coin.symbol != 'MKRUSDT')
                binanceJSON[coin.symbol] = {
                    price: (parseFloat(coin.bidPrice) + parseFloat(coin.askPrice)) / 2, // Mid price for simple display
                    bid: parseFloat(coin.bidPrice),
                    ask: parseFloat(coin.askPrice)
                }
        })
        client.setex('binanceData', config.cacheDuration, JSON.stringify(binanceJSON));
        return resolve(binanceJSON)
    })
}

function fetchBTCTurk(resolve, reject, currentTime, requestCount) {
    request(config.exchangeMarkets.BTCTurk.tickerUrl, function (error, response) {
        if (error) {
            console.error(currentTime, requestCount, '\x1b[31mBTCTurk refresh failed', error)
            return reject('BTCTurk refresh failed')
        }
        console.log(currentTime, requestCount, 'BTCTurk data refreshed')
        let BTCTurkData = JSON.parse(response.body)
        let BTCTurkJSON = { market: "BTCTurk" }
        BTCTurkData.data.forEach(coin => {
            BTCTurkJSON[coin.pair] = {
                price: parseFloat(coin.last),
                ask: parseFloat(coin.ask),
                bid: parseFloat(coin.bid)
            }
        })
        client.setex('BTCTurkData', config.cacheDuration, JSON.stringify(BTCTurkJSON));
        return resolve(BTCTurkJSON)
    })
}

let totalJobsCompleted = 0;
module.exports = {
    statusUpdate: function (message) {
        totalJobsCompleted++
        console.log(totalJobsCompleted, '/', config.totalJob, message)
    },
    twoArrayDifference: function (arr1, arr2) {
        return arr1.filter(x => !arr2.includes(x)).concat(arr2.filter(x => !arr1.includes(x)));
    },
    differenceOfFirstArray: function (arr1, arr2) {
        return arr1.filter(x => !arr2.includes(x));
    },
    telegramMessage: function (message) {
        console.log('Telegram Çağırıldı')
        let options2 = {
            'method': 'POST',
            'url': 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN_1 + '/sendMessage',
            'headers': {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "chat_id": -redacted_chat_id,
                "text": message,
                "parse_mode": "MarkdownV2",
                "disable_web_page_preview": true
            })

        };
        let options = {
            'method': 'POST',
            'url': 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN_2 + '/sendMessage',
            'headers': {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "chat_id": -1001558369109,
                "text": message,
                "parse_mode": "MarkdownV2",
                "disable_web_page_preview": true
            })
        };
        request(options, function (error, response) {
            if (error) throw new Error(error);
            console.log(response.body);
        });
        request(options2, function (error, response) {
            if (error) throw new Error(error);
        });
    },
    getParibuInitialData: function () {
        return new Promise((resolve, reject) => {
            client.get('paribuInitialData', (err, data) => {
                if (err) throw err;
                if (data !== null) {
                    return resolve(data)
                } else {
                    request(config.exchangeMarkets.paribu.initialsUrl, function (error, response) {
                        if (error) throw new Error(error);
                        client.setex('paribuInitialData', 3, response.body);
                        return resolve(response.body)
                    })
                }
            })
        })
    },
    getParibuCoinList: function () {
        return new Promise((resolve, reject) => {
            request(config.exchangeMarkets.paribu.initialsUrl, (error, response, body) => {
                if (error) {
                    reject(error); // Reject the promise if there's an error
                } else if (response.statusCode !== 200) {
                    reject(new Error(`Request failed with status code ${response.statusCode}`));
                } else {
                    resolve(JSON.parse(body).payload.currencies); // Resolve the promise with the response body
                }
            });
        });
    },
    getBTCTurkCoinList: function () {
        return new Promise((resolve, reject) => {
            request(config.exchangeMarkets.BTCTurk.exchangeInfoURL, (error, response, body) => {
                if (error) {
                    reject(error); // Reject the promise if there's an error
                } else if (response.statusCode !== 200) {
                    reject(new Error(`Request failed with status code ${response.statusCode}`));
                } else {
                    resolve(JSON.parse(body).data.currencies.map(currency => currency.symbol.toLowerCase())); // Resolve the promise with the response body
                }
            });
        });
    },
    getBinanceCoinList: function () {
        //kullanım dışı birgün binance için aktif edilmek istenirse işe yarar
        return new Promise((resolve, reject) => {
            request(config.exchangeMarkets.binance.initialsUrl, (error, response, body) => {
                if (error) {
                    reject(error); // Reject the promise if there's an error
                } else if (response.statusCode !== 200) {
                    reject(new Error(`Request failed with status code ${response.statusCode}`));
                } else {
                    resolve(JSON.parse(body).payload.currencies); // Resolve the promise with the response body
                }
            });
        });
    },
    getChilizCoinList: function () {
        //kullanım dışı birgün chiliz için aktif edilmek istenirse işe yarar
        return new Promise((resolve, reject) => {
            request(config.exchangeMarkets.chiliz.tickerUrl, (error, response, body) => {
                if (error) {
                    reject(error); // Reject the promise if there's an error
                } else if (response.statusCode !== 200) {
                    reject(new Error(`Request failed with status code ${response.statusCode}`));
                } else {
                    resolve(JSON.parse(body).payload.currencies); // Resolve the promise with the response body
                }
            });
        });
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
            return currentCoins; // Return the fetched coins list
        } catch (error) {
            throw error; // Propagate the error if there's any
        }
    },
    updateParibuMarkets: function () {
        console.log('Paribu Markets has been updated');
        request(config.exchangeMarkets.BTCTurk.exchangeInfoURL, function (error, response) {
            if (error) throw new Error(error);
            console.log('Paribu Markets has been updated');
        })
        let newParibuMarkets = Object.keys(config.exchangeMarkets.paribu.latestInitialData.data.markets)
        let oldParibuMarkets = config.exchangeMarkets.paribu.markets
        let paribuMarketsDifference = this.twoArrayDifference(oldParibuMarkets, newParibuMarkets)

        if (paribuMarketsDifference.length > 0) {
            let filepath = process.cwd() + "/server/configs/config.json"
            fs.readFile(filepath, 'utf8', function readFileCallback(err, data) {
                if (err) {
                    console.log(err);
                } else {
                    let newData = JSON.parse(data)
                    paribuMarketsDifference.forEach((data, key) => {
                        newData.exchangeMarkets.paribu.markets.push(data)
                    })
                    fs.writeFile(filepath, JSON.stringify(newData, null, 2), 'utf8', err => {
                        if (err) throw err;
                    });
                }
            });
        }

    },
    updateBTCTurkMarkets: function () {

        let that = this
        request(config.exchangeMarkets.BTCTurk.exchangeInfoURL, function (error, response) {
            if (error) throw new Error(error);
            console.log('BTCTurk Markets has been updated');
            let newBTCTurkMarkets = []
            let oldBTCTurkMarkets = config.exchangeMarkets.BTCTurk.markets
            JSON.parse(response.body).data.currencies.forEach(coin => {
                newBTCTurkMarkets.push(coin.symbol.toLowerCase())
            })

            let BTCTurkMarketsDifference = that.twoArrayDifference(oldBTCTurkMarkets, newBTCTurkMarkets)
            if (BTCTurkMarketsDifference.length > 0) {
                let filepath = process.cwd() + "/server/configs/config.json"
                fs.readFile(filepath, 'utf8', function readFileCallback(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        let newData = JSON.parse(data)
                        BTCTurkMarketsDifference.forEach((data, key) => {
                            newData.exchangeMarkets.BTCTurk.markets.push(data)
                        })
                        fs.writeFile(filepath, JSON.stringify(newData, null, 2), 'utf8', err => {
                            if (err) throw err;
                        });
                    }
                });
            }
        })



    },
    updatePRBMarkets: function () {

        let that = this
        request(config.exchangeMarkets.paribu.tickerUrl, function (error, response) {
            if (error) throw new Error(error);
            console.log('Paribu Markets has been updated');
            let newParibuMarketsData = Object.keys(JSON.parse(response.body))
            let newParibuMarkets = []
            let oldParibuMarkets = config.exchangeMarkets.paribu.markets
            newParibuMarketsData.forEach(coin => {
                newParibuMarkets.push(coin.toLowerCase().split('_')[0])
            })

            let paribuMarketsDifference = that.twoArrayDifference(oldParibuMarkets, newParibuMarkets)
            if (paribuMarketsDifference.length > 0) {
                let filepath = process.cwd() + "/server/configs/config.json"
                fs.readFile(filepath, 'utf8', function readFileCallback(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        let newData = JSON.parse(data)
                        paribuMarketsDifference.forEach((data, key) => {
                            newData.exchangeMarkets.paribu.markets.push(data)
                        })
                        fs.writeFile(filepath, JSON.stringify(newData, null, 2), 'utf8', err => {
                            if (err) throw err;
                        });
                    }
                });
            }
        })



    },
    converter: function (object) {
        let items = { "price": [], "volume": [] }
        for (const [key, value] of Object.entries(object)) {
            items.price.push(parseFloat(key))
            items.volume.push(value)
        } return items
    },
    updateBinanceData: function (requestCount, force = false) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            if (!force) {
                client.get('binanceData', (error, data) => {
                    if (error) {
                        console.error(currentTime, requestCount, '\x1b[31mBinance cache failed', error)
                        return reject('binance cache failed')
                    } else if (data !== null) {
                        console.log(currentTime, requestCount, 'Binance data used from cache')
                        return resolve(JSON.parse(data))
                    } else {
                        fetchBinance(resolve, reject, currentTime, requestCount)
                    }
                })
            } else {
                fetchBinance(resolve, reject, currentTime, requestCount)
            }
        })
    },
    updateParibuData: function (requestCount, force = false) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            if (!force) {
                client.get('paribuData', (error, data) => {
                    if (error) {
                        console.error(currentTime, requestCount, '\x1b[31mParibu cache failed', error)
                        return reject('paribu cache failed')
                    } else if (data !== null) {
                        console.log(currentTime, requestCount, 'Paribu data used from cache')
                        return resolve(JSON.parse(data))
                    } else {
                        fetchParibu(resolve, reject, currentTime, requestCount)
                    }
                })
            } else {
                fetchParibu(resolve, reject, currentTime, requestCount)
            }
        })
    },

    updateBTCTurkData: async function (requestCount, force = false) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            if (!force) {
                client.get('BTCTurkData', (error, data) => {
                    if (error) {
                        console.error(currentTime, requestCount, '\x1b[31mBTCTurk cache failed', error)
                        return reject('BTCTurk cache failed')
                    } else if (data !== null) {
                        console.log(currentTime, requestCount, 'BTCTurk data used from cache')
                        return resolve(JSON.parse(data))
                    } else {
                        fetchBTCTurk(resolve, reject, currentTime, requestCount)
                    }
                })
            } else {
                fetchBTCTurk(resolve, reject, currentTime, requestCount)
            }
        })
    },
    updateChilizData: function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            client.get('ChilizData', (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mChiliz cache failed', error)
                    return reject('Chiliz cache failed')
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'Chiliz data used from cache')
                    return resolve(JSON.parse(data))
                } else {
                    request(config.exchangeMarkets.chiliz.tickerUrl, function (error, response) {
                        if (error) {
                            console.error(currentTime, requestCount, '\x1b[31mChiliz refresh failed', error)
                            return reject('Chiliz refresh failed')
                        }
                        console.log(currentTime, requestCount, 'Chiliz data refreshed')
                        let chilizData = JSON.parse(response.body)
                        let chilizJSON = { market: "chiliz" }
                        chilizData.forEach(coin => {
                            chilizJSON[coin.symbol] = (parseFloat(coin.bidPrice) + parseFloat(coin.askPrice)) / 2
                        })
                        client.setex('chilizData', config.cacheDuration, JSON.stringify(chilizJSON));
                        return resolve(chilizJSON)
                    })
                }
            })
        }
        )
    },
    multipleROIcalculate: function (priceList, coin) {
        priceList = priceList.filter(Number);
        const price1 = Math.max(...priceList)
        const price2 = Math.min(...priceList)
        return price1 / price2 * 100 - 100
    },
    removeDuplicatesFromArray: function (arrayList) {
        return [...new Set(arrayList)];
    }

};
