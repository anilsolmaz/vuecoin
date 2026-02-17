const express = require('express');
const { DateTime } = require("luxon");
const db = require('../db');
const router = express.Router();
const config = require('../configs/config.json');
const request = require('request');
const redis = require("redis");
const f = require('../js/functions')
const DataController = require('../controllers/DataController');

// Redis connection remains for legacy routes (ag list management)
const client = redis.createClient({
    "port": process.env.REDIS_PORT,
    "password": process.env.REDIS_PASSWORD,
    "host": process.env.REDIS_HOST
});

// Routes
router.get('/test/', async (req, res, next) => {
    // paribuMarketsList removed - legacy test
    res.status(200).json('test')
})

router.get('/test2/', async (req, res, next) => {
    let returnData = 'worked successfully'
    res.status(200).json(returnData)
})


// --- Data Controller Routes ---
router.get('/allParibuData/', DataController.getAllParibuData);
router.get('/updateParibuMarkets/', DataController.updateParibuMarkets);
router.get('/refresh program/', DataController.updateParibuMarkets);


// --- Legacy Coin List Management ---

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
