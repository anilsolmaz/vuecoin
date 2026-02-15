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
        var items = { "price": [], "volume": [] }
        for (const [key, value] of Object.entries(object)) {
            items.price.push(parseFloat(key))
            items.volume.push(value)
        } return items
    },
    updateBinanceData: function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            client.get('binanceData', (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mBinance cache failed', error)
                    return reject('binance cache failed')
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'Binance data used from cache')
                    return resolve(JSON.parse(data))
                } else {
                    request(config.exchangeMarkets.binance.tickerUrl, function (error, response) {
                        if (error) {
                            console.error(currentTime, requestCount, '\x1b[31mbinance refresh failed', error)
                            return reject('binance refresh failed')
                        }
                        console.log(currentTime, requestCount, 'Binance data refreshed')
                        let binanceData = JSON.parse(response.body)
                        let binanceJSON = { market: "binance" }
                        binanceData.forEach(coin => {
                            if (coin.symbol != 'HNTUSDT' & coin.symbol != 'GALUSDT' & coin.symbol != 'REEFUSDT' & coin.symbol != 'BEAMUSDT' & coin.symbol != 'BALUSDT' & coin.symbol != 'OMGUSDT' & coin.symbol != 'RNDRUSDT' & coin.symbol != 'WAVESUSDT' & coin.symbol != 'CLVUSDT' & coin.symbol != 'RDNTUSDT' & coin.symbol != 'FTMUSDT' & coin.symbol != 'MATICUSDT' & coin.symbol != 'EOSUSDT' & coin.symbol != 'MKRUSDT')
                                binanceJSON[coin.symbol] = parseFloat(coin.price)
                        })
                        client.setex('binanceData', config.cacheDuration, JSON.stringify(binanceJSON));
                        return resolve(binanceJSON)
                    })
                }
            })
        })
    },
    updateParibuData: function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            client.get('paribuData', (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mParibu cache failed', error)
                    return reject('paribu cache failed')
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'Paribu data used from cache')
                    return resolve(JSON.parse(data))
                } else {
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
                                paribuJSON[coinName] = (parseFloat(paribuData[coin]['last']))
                            }
                        })
                        client.setex('paribuData', config.cacheDuration, JSON.stringify(paribuJSON));
                        return resolve(paribuJSON)
                    })
                }
            })
        })
    },
    updateHuobiData: function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            client.get('huobiData', (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mHuobi cache failed', error)
                    return reject('huobi cache failed')
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'Huobi data used from cache')
                    return resolve(JSON.parse(data))
                } else {
                    request(config.exchangeMarkets.huobi.tickerUrl, function (error, response) {
                        if (error) {
                            console.error(currentTime, requestCount, '\x1b[31mhuobi refresh failed', error)
                            return reject('Huobi refresh failed')
                        }
                        console.log(currentTime, requestCount, 'Huobi data refreshed')
                        let huobiData = JSON.parse(response.body).data
                        let huobiJSON = { market: "huobi" }
                        huobiData.forEach(coin => {
                            huobiJSON[coin.symbol] = (parseFloat(coin.bid) + parseFloat(coin.ask)) / 2
                        })
                        client.setex('huobiData', config.cacheDuration, JSON.stringify(huobiJSON));
                        console.log(huobiJSON)
                        return resolve(huobiJSON)
                    })
                }
            })
        })
    },
    updateKrakenData: function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            client.get('krakenData', (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mKraken cache failed', error)
                    return reject('kraken cache failed')
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'Kraken data used from cache')
                    return resolve(JSON.parse(data))
                } else {
                    request(config.exchangeMarkets.kraken.tickerUrl, function (error, response) {
                        if (error) {
                            console.error(currentTime, requestCount, '\x1b[31mKraken refresh failed', error)
                            return reject('Kraken refresh failed')
                        }
                        console.log(currentTime, requestCount, 'Kraken data refreshed')
                        let krakenData = JSON.parse(response.body)
                        let krakenJSON = { market: "kraken" }
                        krakenData.forEach(coin => {
                            if (coin.symbol != 'NUBUSD' & coin.symbol != 'KEEPBUSD' & coin.symbol != 'GALBUSD' & coin.symbol != 'POLYBUSD' & coin.symbol != 'RLCBUSD')
                                krakenJSON[coin.symbol] = parseFloat(coin.price)
                        })
                        client.setex('krakenData', config.cacheDuration, JSON.stringify(krakenJSON));
                        return resolve(krakenJSON)
                    })
                }
            })
        })
    },
    updateKuCoinData: function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            client.get('kuCoinData', (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mKuCoin cache failed', error)
                    return reject('KuCoin cache failed')
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'KuCoin data used from cache')
                    return resolve(JSON.parse(data))
                } else {
                    request(config.exchangeMarkets.kuCoin.tickerUrl, function (error, response) {
                        if (error) {
                            console.error(currentTime, requestCount, '\x1b[31mKuCoin refresh failed', error)
                            return reject('KuCoin refresh failed')
                        }
                        console.log(currentTime, requestCount, 'KuCoin data refreshed')
                        let kuCoinData = JSON.parse(response.body)
                        let kuCoinJSON = { market: "kuCoin" }
                        kuCoinData.forEach(coin => {
                            if (coin.symbol != 'NUBUSD' & coin.symbol != 'KEEPBUSD' & coin.symbol != 'GALBUSD' & coin.symbol != 'POLYBUSD' & coin.symbol != 'RLCBUSD')
                                kuCoinJSON[coin.symbol] = parseFloat(coin.price)
                        })
                        client.setex('kuCoinData', config.cacheDuration, JSON.stringify(kuCoinJSON));
                        return resolve(kuCoinJSON)
                    })
                }
            })
        })
    },
    updateFTXData: function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            client.get('FTXData', (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mFTX cache failed', error)
                    return reject('FTX cache failed')
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'FTX data used from cache')
                    return resolve(JSON.parse(data))
                } else {
                    request(config.exchangeMarkets.FTX.tickerUrl, function (error, response) {
                        console.log(error)
                        if (error != null && response.statusCode == 200) {
                            console.log(currentTime, requestCount, 'FTX data refreshed')
                            let FTXData = JSON.parse(response.body)

                            let FTXJSON = { market: "FTX" }
                            FTXData.result.forEach(coin => {
                                if (coin.name != 'FB/USD' & coin.name != 'GAL/USD' & coin.name != 'BTT/USD')
                                    FTXJSON[coin.name.split('/')[0] + 'USDT'] = (parseFloat(coin.bid) + parseFloat(coin.ask)) / 2
                            })
                            client.setex('FTXData', config.cacheDuration, JSON.stringify(FTXJSON));
                            return resolve(FTXJSON)
                        } else {
                            console.error(currentTime, requestCount, '\x1b[31mFTX refresh failed', error)
                            return reject('FTX refresh failed')
                        }

                    })
                }
            })
        })
    },
    updateBTCTurkData: async function (requestCount) {
        let currentTime = DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        return new Promise((resolve, reject) => {
            client.get('BTCTurkData', (error, data) => {
                if (error) {
                    console.error(currentTime, requestCount, '\x1b[31mBTCTurk cache failed', error)
                    return reject('BTCTurk cache failed')
                } else if (data !== null) {
                    console.log(currentTime, requestCount, 'BTCTurk data used from cache')
                    return resolve(JSON.parse(data))
                } else {
                    request(config.exchangeMarkets.BTCTurk.tickerUrl, function (error, response) {
                        if (error) {
                            console.error(currentTime, requestCount, '\x1b[31mBTCTurk refresh failed', error)
                            return reject('BTCTurk refresh failed')
                        }
                        console.log(currentTime, requestCount, 'BTCTurk data refreshed')
                        let BTCTurkData = JSON.parse(response.body)
                        let BTCTurkJSON = { market: "BTCTurk" }
                        BTCTurkData.data.forEach(coin => {
                            BTCTurkJSON[coin.pair] = (parseFloat(coin.last))
                        })
                        client.setex('BTCTurkData', config.cacheDuration, JSON.stringify(BTCTurkJSON));
                        return resolve(BTCTurkJSON)
                    })
                }
            })
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
    increaseValueByOne: function () {
        console.log('increaseValueByOne worked!');
        let config2 = $.getJSON("test.json", function (json) {
            console.log(json); // this will show the info it in firebug console
        });
        console.log('Config >>> Total Job : ', config2.totalJob)

        let filepath = process.cwd() + "/server/configs/config.json"
        fs.readFile(filepath, 'utf8', function readFileCallback(err, data) {
            if (err) {
                console.log(err);
            } else {
                let newData = JSON.parse(data)
                newData.totalJob = newData.totalJob + 1
                console.log('Total Job : ', newData.totalJob)
                fs.writeFile(filepath, JSON.stringify(newData, null, 2), 'utf8', err => {
                    if (err) throw err;
                });
            }
        });
    },
    removeDuplicatesFromArray: function (arrayList) {
        return [...new Set(arrayList)];
    }

};
