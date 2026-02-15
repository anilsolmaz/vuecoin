const express = require('express');
const { DateTime } = require("luxon");
const db = require('../db');
const router = express.Router();
const config = require('../configs/config.json');
const request = require('request');
const redis = require("redis");
const f = require('../js/functions')

//Create error log Stream
const fs = require('fs');
const { response } = require("express");
const { updateBinanceData, updateBTCTurkData, updateChilizData, updateFTXData } = require("../js/functions");
let errorLogStream = fs.createWriteStream(process.cwd() + '/server/logs/error.log', { flags: 'a' })

console.log(process.cwd())
//Error handling, avoiding crash
process.on('uncaughtException', function (err) {
    const date = new Date();
    console.error(err);
    errorLogStream.write(date + '\n' + err.stack + '\n\n');
});

// Removed global unSuccessfulJobs and counter to prevent race conditions
let paribuUSDT = 0
let paribuCHZ = 0
let paribuMarketsList = []
let coinList = {}
let requestCount = 0

// Redis.io db bilgileri
const client = redis.createClient({
    "port": process.env.REDIS_PORT,
    "password": process.env.REDIS_PASSWORD,
    "host": process.env.REDIS_HOST
});


//Program buradan sonra başlıyor
(async () => {

    try {
        f.getParibuInitialData()
            .then(r => {
                paribuMarketsList = Object.keys(JSON.parse(r).payload.markets)
                paribuMarketsList.forEach((key, index) => {
                    //Her Coin için gerekli bilgilerin yer aldığı boş obje oluşturulur
                    switch (key) {
                        case 'miota_tl':
                            coinList['iota'] = {
                                "ROI": 0,
                                "fraction": (JSON.parse(r).payload.markets)[key].precisions.price,
                                "paribu": {
                                    "try": {
                                        "price": null,
                                        "inUSDT": null
                                    },
                                    "usdt": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "chz": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "lastUpdateTime": null
                                },
                                "binance": {
                                    "try": {
                                        "price": null,
                                        "inUSDT": null
                                    },
                                    "usdt": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "lastUpdateTime": null
                                },
                                "BTCTurk": {
                                    "try": {
                                        "price": null,
                                        "inUSDT": null
                                    },
                                    "usdt": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "lastUpdateTime": null
                                },
                                "chiliz": {
                                    "chz": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "usdt": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "lastUpdateTime": null
                                }
                            }
                            break;
                        default:
                            coinList[key.split('_')[0]] = {
                                "ROI": 0,
                                "fraction": (JSON.parse(r).payload.markets)[key].precisions.price,
                                "paribu": {
                                    "try": {
                                        "price": null,
                                        "inUSDT": null
                                    },
                                    "usdt": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "chz": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "lastUpdateTime": null
                                },
                                "binance": {
                                    "try": {
                                        "price": null,
                                        "inUSDT": null
                                    },
                                    "usdt": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "lastUpdateTime": null
                                },
                                "BTCTurk": {
                                    "try": {
                                        "price": null,
                                        "inUSDT": null
                                    },
                                    "usdt": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "lastUpdateTime": null
                                },
                                "chiliz": {
                                    "chz": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "usdt": {
                                        "price": null,
                                        "inTRY": null
                                    },
                                    "lastUpdateTime": null
                                }
                            }
                    }
                })
            })
        f.statusUpdate('Paribu Initials&markets updated')
    } catch (e) {
        console.log('Initial verileri alınırken hata gerçekleşti', e)
    }
})()

//console.log('paribu Data : ', paribuInitialData)
f.updateBTCTurkMarkets()
f.updatePRBMarkets()

router.get('/test/', async (req, res, next) => {
    console.log('test')
    paribuMarketsList = ['chz-tl', 'icp-tl', 'usdt-tl']
    res.status(200).json('test')
})

router.get('/test2/', async (req, res, next) => {
    let returnData = 'worked successfully'

    async (req, res, next) => { }

    console.log(returnData)
    res.status(200).json(returnData)
})

router.get('/coinListUpdateFromParibu/', async (req, res, next) => {
    try {
        let paribuCoins = await f.getParibuCoinList();
        let newCoins = Object.keys(paribuCoins);

        const currentCoins = await new Promise((resolve, reject) => {
            client.lrange('ag', 0, -1, (error, coins) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(coins);
                }
            });
        });

        const coinsToAdd = newCoins.filter(coin => !currentCoins.includes(coin));

        if (coinsToAdd.length > 0) {
            client.lpush('ag', ...coinsToAdd);
            console.log('New coins added:', coinsToAdd);
        } else {
            console.log('No new coins to add.');
        }

        const updatedCoins = await new Promise((resolve, reject) => {
            client.lrange('ag', 0, -1, (error, coins) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(coins);
                }
            });
        });

        res.status(200).json(updatedCoins);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/coinListUpdateFromBTCTurk/', async (req, res, next) => {
    try {
        let newCoins = await f.getBTCTurkCoinList();

        const currentCoins = await new Promise((resolve, reject) => {
            client.lrange('ag', 0, -1, (error, coins) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(coins);
                }
            });
        });

        const coinsToAdd = newCoins.filter(coin => !currentCoins.includes(coin));

        if (coinsToAdd.length > 0) {
            client.lpush('ag', ...coinsToAdd);
            console.log('New coins added:', coinsToAdd);
        } else {
            console.log('No new coins to add.');
        }

        const updatedCoins = await new Promise((resolve, reject) => {
            client.lrange('ag', 0, -1, (error, coins) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(coins);
                }
            });
        });

        res.status(200).json(updatedCoins);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/coinListUpdateFromBinance/', async (req, res, next) => {
    //kullanım dışı birgün binance için aktif edilmek istenirse işe yarar
    try {
        let binanceCoins = await f.getBinanceCoinList();
        let newCoins = Object.keys(binanceCoins);

        const currentCoins = await new Promise((resolve, reject) => {
            client.lrange('ag', 0, -1, (error, coins) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(coins);
                }
            });
        });

        const coinsToAdd = newCoins.filter(coin => !currentCoins.includes(coin));

        if (coinsToAdd.length > 0) {
            client.lpush('ag', ...coinsToAdd);
            console.log('New coins added:', coinsToAdd);
        } else {
            console.log('No new coins to add.');
        }

        const updatedCoins = await new Promise((resolve, reject) => {
            client.lrange('ag', 0, -1, (error, coins) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(coins);
                }
            });
        });

        res.status(200).json(updatedCoins);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/coinListUpdateFromChiliz/', async (req, res, next) => {
    //kullanım dışı birgün chiliz için aktif edilmek istenirse işe yarar
    try {
        let chilizCoins = await f.getChilizCoinList();
        let newCoins = Object.keys(chilizCoins);

        const currentCoins = await new Promise((resolve, reject) => {
            client.lrange('ag', 0, -1, (error, coins) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(coins);
                }
            });
        });

        const coinsToAdd = newCoins.filter(coin => !currentCoins.includes(coin));

        if (coinsToAdd.length > 0) {
            client.lpush('ag', ...coinsToAdd);
            console.log('New coins added:', coinsToAdd);
        } else {
            console.log('No new coins to add.');
        }

        const updatedCoins = await new Promise((resolve, reject) => {
            client.lrange('ag', 0, -1, (error, coins) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(coins);
                }
            });
        });

        res.status(200).json(updatedCoins);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/removeCoinsFromList/', async (req, res, next) => {
    try {
        const coinList = await f.getRedisCoinList();
        const requestCoins = req.body.coins;

        if (!requestCoins) {
            return res.status(400).json({ error: 'Coins field is missing in the request body.' });
        }

        let coinsArray = [];
        try {
            coinsArray = JSON.parse(requestCoins);
        } catch (parseError) {
            // If JSON parsing fails, we assume it's a comma-separated string
            coinsArray = requestCoins.split(',').map(coin => coin.trim());
        }

        if (!Array.isArray(coinsArray)) {
            return res.status(400).json({ error: 'Coins should be provided as an array or comma-separated string.' });
        }

        const invalidCoins = coinsArray.filter(coin => !coinList.includes(coin));
        if (invalidCoins.length > 0) {
            return res.status(400).json({ error: 'Invalid coins: ' + invalidCoins.join(', ') });
        }

        const removedCoins = coinList.filter(coin => !coinsArray.includes(coin));

        // Here you can perform the operation to remove coins from the list in your f module.
        // For example: await f.removeCoinsFromList(coinsArray);

        res.status(200).json({ message: 'Coins removed successfully.', removedCoins });
    } catch (error) {
        next(error); // Pass the error to the error-handling middleware
    }
});

router.post('/tester/', async (req, res, next) => {
    console.log('just a test');
    res.send('Test successful');
});



router.get('/allParibuData/', async (req, res, next) => {

    requestCount++
    console.log(DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS), '#', requestCount, 'Arrive here')
    let finalResults = []
    let allParibuMarkets = paribuMarketsList
    //let allParibuMarkets = ['chz-tl','icp-tl','eth-tl','btc-tl','usdt-tl']

    //let allJobs = allParibuMarkets.map((coin, index) => getParibuData(coin))
    let allJobs = []
    allJobs.push(f.updateBinanceData(requestCount).catch(e => null))
    allJobs.push(f.updateBTCTurkData(requestCount).catch(e => null))
    //allJobs.push(f.updateChilizData(requestCount))
    allJobs.push(f.updateParibuData(requestCount).catch(e => null))
    // allJobs.push(f.updateKrakenData(requestCount))
    // allJobs.push(f.updateKuCoinData(requestCount))
    // allJobs.push(f.updateHuobiData(requestCount))

    let results = []
    try {
        results = await Promise.all(allJobs);
    }
    catch {
        console.log('boom headshot')
    }

    results.forEach((result, index) => {
        if (result != null)
            finalResults.push(result)
    })


    // console.log(DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS), '#', requestCount, 'allParibuData successfully worked!')


    finalResults.forEach(coin => {
        switch (coin.market) {
            case 'BTCTurk':
                finalResults['BTCTurk'] = coin
                break;
            case 'chiliz':
                finalResults['chiliz'] = coin
                break;
            case 'binance':
                finalResults['binance'] = coin
                break;
            case 'paribu':
                finalResults['paribu'] = coin
                break;
        }
    })
    if (finalResults.paribu.miota != undefined) {
        finalResults.paribu.iota = finalResults.paribu.miota
        delete finalResults.paribu.miota
    }
    if (finalResults.paribu.eos != undefined) {
        finalResults.paribu.eos = finalResults.paribu.a
        delete finalResults.paribu.a
    }

    if (finalResults.paribu.mkr != undefined) {
        delete finalResults.paribu.mkr
    }

    delete finalResults.paribu.market
    delete finalResults.paribu.tvk
    delete finalResults.paribu.keep
    delete finalResults.paribu.pla
    delete finalResults.paribu.agix
    delete finalResults.paribu.ocean

    if (finalResults && finalResults.paribu) {
        Object.keys(finalResults.paribu).forEach((coinName) => {
            if (coinName) {
                let coinValue = finalResults.paribu[coinName];
                let coinPairUpperCase = coinName.toUpperCase();

                if (!coinList[coinName]) {
                    coinList[coinName] = { paribu: {}, binance: {}, BTCTurk: {} };
                }

                coinList[coinName]['paribu']['lastUpdateTime'] = DateTime.local().setZone("Turkey");
                coinList[coinName]['paribu']['try'] = { price: coinValue };

                if (finalResults.binance) {
                    coinList[coinName]['binance']['usdt'] = { price: parseFloat(finalResults.binance[coinPairUpperCase + 'USDT']) || 0 };
                    coinList[coinName]['binance']['try'] = { price: parseFloat(finalResults.binance[coinPairUpperCase + 'TRY']) || 0 };
                }

                if (finalResults.BTCTurk) {
                    coinList[coinName]['BTCTurk']['usdt'] = { price: parseFloat(finalResults.BTCTurk[coinPairUpperCase + 'USDT']) || 0 };
                    coinList[coinName]['BTCTurk']['try'] = { price: parseFloat(finalResults.BTCTurk[coinPairUpperCase + 'TRY']) || 0 };
                }
            }
        });
    } else {
        f.updatePRBMarkets()
    }

    let filteredParibuCoins = config.exchangeMarkets.paribu.markets.map(x => x.split('_')[0])
    let coinsLeftFromBTCTurk = f.differenceOfFirstArray(config.exchangeMarkets.BTCTurk.markets, filteredParibuCoins)

    coinsLeftFromBTCTurk.splice(coinsLeftFromBTCTurk.indexOf(("try")), 1)
    coinsLeftFromBTCTurk.splice(coinsLeftFromBTCTurk.indexOf(("usdc")), 1)
    coinsLeftFromBTCTurk.push('mask')
    coinsLeftFromBTCTurk.push('bnb')
    coinsLeftFromBTCTurk.push('ftt')
    coinsLeftFromBTCTurk.push('hft')
    coinsLeftFromBTCTurk.push('hook')
    coinsLeftFromBTCTurk.push('porto')
    coinsLeftFromBTCTurk.push('lazio')
    coinsLeftFromBTCTurk.push('santos')
    coinsLeftFromBTCTurk.push('alpine')
    coinsLeftFromBTCTurk.push('id')
    coinsLeftFromBTCTurk.push('edu')
    coinsLeftFromBTCTurk.push('pixel')
    coinsLeftFromBTCTurk.push('strk')
    coinsLeftFromBTCTurk.push('cyber')
    coinsLeftFromBTCTurk.push('sei')
    coinsLeftFromBTCTurk.forEach((key, index) => {
        coinList[key] = {
            "ROI": 0,
            "fraction": 0,
            "paribu": {
                "try": {
                    "price": null,
                    "inUSDT": null
                },
                "usdt": {
                    "price": null,
                    "inTRY": null
                },
                "chz": {
                    "price": null,
                    "inTRY": null
                },
                "lastUpdateTime": null
            },
            "binance": {
                "try": {
                    "price": null,
                    "inUSDT": null
                },
                "usdt": {
                    "price": null,
                    "inTRY": null
                },
                "lastUpdateTime": null
            },
            "BTCTurk": {
                "try": {
                    "price": null,
                    "inUSDT": null
                },
                "usdt": {
                    "price": null,
                    "inTRY": null
                },
                "lastUpdateTime": null
            },
            "FTX": {
                "try": {
                    "price": null,
                    "inUSDT": null
                },
                "usdt": {
                    "price": null,
                    "inTRY": null
                },
                "lastUpdateTime": null
            },
            "chiliz": {
                "chz": {
                    "price": null,
                    "inTRY": null
                },
                "usdt": {
                    "price": null,
                    "inTRY": null
                },
                "lastUpdateTime": null
            }
        }

    })
    coinsLeftFromBTCTurk.forEach((coin) => {
        coinList[coin]['binance']['usdt']['price'] = parseFloat(finalResults.binance[coin.toUpperCase() + 'USDT'])
        coinList[coin]['binance']['try']['price'] = parseFloat(finalResults.binance[coin.toUpperCase() + 'TRY'])
        // coinList[coin]['huobi']['usdt']['price'] = parseFloat(finalResults.huobi[coin.toUpperCase()+'USDT'])
        // coinList[coin]['huobi']['try']['price'] = parseFloat(finalResults.huobi[coin.toUpperCase()+'TRY'])
        coinList[coin]['BTCTurk']['usdt']['price'] = parseFloat(finalResults.BTCTurk[coin.toUpperCase() + 'USDT'])
        coinList[coin]['BTCTurk']['try']['price'] = parseFloat(finalResults.BTCTurk[coin.toUpperCase() + 'TRY'])
    })

    //Tüm veriler tekrardan dönerek ROI gibi ekstra hesaplamalar yapılır.
    Object.keys(coinList).map((coin) => {
        if (coinList['usdt']?.paribu?.try?.price != null)
            client.setex('paribuUSDT', config.cacheDuration, coinList['usdt'].paribu.try.price);

        if (coinList['chz']?.paribu?.try?.price != null)
            client.setex('paribuCHZ', config.cacheDuration, coinList['chz'].paribu.try.price);

        client.get('paribuUSDT', (err, data) => {
            if (err) throw err;
            if (data !== null) {
                paribuUSDT = data;
            }
        });

        client.get('paribuCHZ', (err, data) => {
            if (err) throw err;
            if (data !== null) {
                paribuCHZ = data;
            }
        });

        if (coinList[coin]?.paribu?.try?.price != null && paribuUSDT) {
            coinList[coin].paribu.try.inUSDT = coinList[coin].paribu.try.price / paribuUSDT;
        }

        if (coinList[coin]?.paribu?.usdt?.price != null && paribuUSDT) {
            coinList[coin].paribu.usdt.inTRY = coinList[coin].paribu.usdt.price * paribuUSDT;
        }

        if (coinList[coin]?.binance?.usdt?.price != null && paribuUSDT) {
            coinList[coin].binance.usdt.inTRY = coinList[coin].binance.usdt.price * paribuUSDT;
        }

        if (coinList[coin]?.binance?.try?.price != null && paribuUSDT) {
            coinList[coin].binance.try.inUSDT = coinList[coin].binance.try.price / paribuUSDT;
        }

        if (coinList[coin]?.BTCTurk?.usdt?.price != null && paribuUSDT) {
            coinList[coin].BTCTurk.usdt.inTRY = coinList[coin].BTCTurk.usdt.price * paribuUSDT;
        }

        if (coinList[coin]?.BTCTurk?.try?.price != null && paribuUSDT) {
            coinList[coin].BTCTurk.try.inUSDT = coinList[coin].BTCTurk.try.price / paribuUSDT;
        }

        if (coinList[coin]?.chiliz?.chz?.price != null && paribuCHZ) {
            coinList[coin].chiliz.chz.inTRY = coinList[coin].chiliz.chz.price * paribuCHZ;
        }

        if (coinList[coin]?.chiliz?.usdt?.price != null && paribuUSDT) {
            coinList[coin].chiliz.usdt.inTRY = coinList[coin].chiliz.usdt.price * paribuUSDT;
        }

        let ROIArray = [
            coinList[coin]?.paribu?.try?.price ?? 0,
            coinList[coin]?.binance?.usdt?.inTRY ?? 0,
            coinList[coin]?.BTCTurk?.try?.price ?? 0
        ];

        coinList[coin].ROI = f.multipleROIcalculate(ROIArray);

        if (coinList[coin].ROI === 0 && !['slp', 'bnb', 'atlas', 'goz', 'fb', 'btt', 'tryc', 'ceek', 'raca'].includes(coin)) {
            // console.log(coin, coinList[coin].ROI, ROIArray, paribuUSDT);
        }
    });


    //coinList['usdt']['binance']['usdt']['inTRY'] = parseFloat(config.exchangeMarkets.binance.data['USDTTRY'])
    //coinList['usdt'].ROI = f.roiCalculate(coinList['usdt'].paribu.try.price,coinList['usdt'].binance.usdt.inTRY)


    await new Promise(r => setTimeout(r, 500));
    Object.keys(coinList)
        .sort()
    res.status(200).json(coinList)


})

router.get('/updateParibuMarkets/', async (req, res, next) => {
    f.increaseValueByOne()
    res.status(200).json('Başarıyla update edildi')
})

router.get('/refresh program/', async (req, res, next) => {
    f.increaseValueByOne()
    res.status(200).json('Başarıyla update edildi')
})

router.get('/singlecoin/:kur',
    function cache(req, res, next) {
        const { kur } = req.params;
        client.get(kur, (err, data) => {
            if (err) throw err;
            if (data !== null) {
                res.status(200).json(JSON.parse(data))
            } else {
                next();
            }
        });
    },
    async (req, res, next) => {
        try {
            let results = await db.singleCoin(req.params.kur)
            if (results.status == true) {
                let returnData = {}
                let coinData = {}
                coinData = {
                    "buy": f.converter(results.data.buy),
                    "sell": f.converter(results.data.sell)
                }

                coinData.average = (coinData.buy.price[0] + coinData.sell.price[0]) / 2
                coinData.sell.total = []
                coinData.buy.total = []
                coinData.buy.price.forEach((x, key) => {
                    coinData.buy.total.push(parseFloat(coinData.buy.price[key] * coinData.buy.volume[key]))
                })
                coinData.sell.price.forEach((x, key) => {
                    coinData.sell.total.push(parseFloat(coinData.sell.price[key] * coinData.sell.volume[key]))
                })
                let total = 0
                let totalVolume = 0
                for (let i = 0; i < 10; i++) {
                    total += coinData.sell.total[i] + coinData.buy.total[i]
                    totalVolume += coinData.sell.volume[i] + coinData.buy.volume[i]
                }

                coinData.w_average = total / totalVolume
                returnData = {
                    status: true,
                    coinPair: req.params.kur,
                    average: coinData.average,
                    w_average: coinData.w_average,
                    market: "paribu",
                    lastUpdateTime: DateTime.local().setZone("Turkey"),
                    lastUpdateTimeString: DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
                }
                client.setex(req.params.kur, config.cacheDuration, JSON.stringify(returnData));
                res.status(200).json(returnData)
            } else {
                res.status(200).json({

                })
            }
        } catch (e) {
            res.status(500).json(e)
        }
    });

module.exports = router;
