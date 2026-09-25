const express = require('express');
const { DateTime } = require("luxon");
const db = require('../db');
const router = express.Router();
const config = require('../configs/config.json');
const f = require('../js/functions');

const DataController = require('../controllers/DataController');

// Unified Redis Service
const client = require('../services/RedisService');
const CoinDataService = require('../services/CoinDataService');

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
router.get('/refresh-program/', DataController.updateParibuMarkets);


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

        // Actually remove the coins from Redis
        for (const coin of coinsArray) {
            await new Promise((resolve, reject) => {
                client.lrem('ag', 0, coin, (error, count) => {
                    if (error) reject(error);
                    else resolve(count);
                });
            });
        }

        res.status(200).json({ message: 'Coins removed successfully.', removedCoins: coinsArray });
    } catch (error) {
        next(error); // Pass the error to the error-handling middleware
    }
});

router.post('/tester/', async (req, res, next) => {
    console.log('just a test');
    res.send('Test successful');
});

// --- Telegram Routes ---
router.post('/telegram', async (req, res) => {
    try {
        const authKey = req.headers['x-admin-key'] || req.query.key;
        const expectedKey = process.env.ADMIN_KEY || process.env.REDIS_PASSWORD;
        if (process.env.NODE_ENV !== 'test' && (!authKey || authKey !== expectedKey)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const message = req.body.message;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ status: 'error', message: 'Message body missing or invalid' });
        }

        const TelegramService = require('../services/TelegramService');
        await TelegramService.broadcast(message);

        res.status(200).json({ status: 'başarılı' });
    } catch (error) {
        console.error('Telegram Route Error', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

router.get('/telegram/:message', async (req, res) => {
    try {
        const authKey = req.headers['x-admin-key'] || req.query.key;
        const expectedKey = process.env.ADMIN_KEY || process.env.REDIS_PASSWORD;
        if (process.env.NODE_ENV !== 'test' && (!authKey || authKey !== expectedKey)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const message = req.params.message;
        const TelegramService = require('../services/TelegramService');
        await TelegramService.sendAzelert(message); // Uses specific Azelert bot

        res.status(200).json({ status: 'başarılı' });
    } catch (error) {
        console.error('Telegram Route Error', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
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

// --- Settings Routes ---
router.get('/settings', async (req, res) => {
    client.get('arb_settings', (err, reply) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const defaults = {
            crossEnabled: true,
            intraEnabled: true,
            paribuEnabled: true,
            crossMinProfit: 1000,
            crossMinROI: 0.50,
            crossCooldown: 5,
            intraMinROI: 0,
            intraMinProfit: 100,
            intraCooldown: 5,
            paribuMinROI: 0,
            paribuMinProfit: 50,
            blockedCoins: [],
            topCoins: ['btc', 'bnb', 'eth', 'usdt', 'fet', 'sol', 'ftt', 'xrp', 'pepe', 'shib', 'btt', 'chz'],
            topDealsCount: 10
        };
        if (!reply) {
            return res.json(defaults);
        }
        try {
            const parsed = JSON.parse(reply);
            return res.json({ ...defaults, ...parsed });
        } catch (e) {
            return res.json(defaults);
        }
    });
});

router.post('/settings', async (req, res) => {
    const {
        crossEnabled,
        intraEnabled,
        paribuEnabled,
        crossCooldown,
        crossMinProfit,
        crossMinROI,
        intraCooldown,
        intraMinROI,
        intraMinProfit,
        paribuMinROI,
        paribuMinProfit,
        blockedCoins,
        topCoins,
        topDealsCount
    } = req.body;

    const parseNum = (v, defaultVal) => {
        if (v === undefined || v === null || v === '') return defaultVal;
        const n = parseFloat(String(v).replace(',', '.'));
        return isNaN(n) ? defaultVal : n;
    };

    // Validate and parse values
    const settings = {
        crossEnabled: crossEnabled !== false,
        intraEnabled: intraEnabled !== false,
        paribuEnabled: paribuEnabled !== false,
        crossCooldown: parseNum(crossCooldown, 5),
        crossMinProfit: parseNum(crossMinProfit, 1000),
        crossMinROI: parseNum(crossMinROI, 0.5),
        intraCooldown: parseNum(intraCooldown, 5),
        intraMinROI: parseNum(intraMinROI, 0),
        intraMinProfit: parseNum(intraMinProfit, 100),
        paribuMinROI: parseNum(paribuMinROI, 0),
        paribuMinProfit: parseNum(paribuMinProfit, 50),
        blockedCoins: Array.isArray(blockedCoins) ? blockedCoins.map(c => String(c).toLowerCase().trim()).filter(Boolean) : [],
        topCoins: Array.isArray(topCoins) ? topCoins : ['btc', 'bnb', 'eth', 'usdt', 'fet', 'sol', 'ftt', 'xrp', 'pepe', 'shib', 'btt', 'chz'],
        topDealsCount: (topDealsCount !== undefined) ? parseInt(topDealsCount) : 10
    };

    client.set('arb_settings', JSON.stringify(settings), async (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Trigger immediate refresh in the arbitrage service
        await CoinDataService.loadSettings();

        res.json({ message: 'Settings saved successfully', settings });
    });
});
// --- Portfolio Save/Retrieve ---
router.post('/portfolio', (req, res) => {
    const { name, data } = req.body;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Valid profile name is required' });
    }
    const cleanName = name.trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,40}$/.test(cleanName)) {
        return res.status(400).json({ error: 'Profile name must be alphanumeric (1-40 characters, dashes/underscores allowed)' });
    }
    if (!Array.isArray(data) || data.length > 200) {
        return res.status(400).json({ error: 'Portfolio data must be an array of maximum 200 items' });
    }

    // Sanitize items
    const sanitizedData = [];
    for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        const coin = String(item.coin || '').toLowerCase().trim();
        const amount = parseFloat(item.amount);
        const avgPrice = item.avgPrice !== undefined && item.avgPrice !== null && item.avgPrice !== '' ? parseFloat(item.avgPrice) : null;
        if (!/^[a-z0-9]{1,20}$/.test(coin) || isNaN(amount) || amount <= 0) continue;
        sanitizedData.push({
            coin,
            amount,
            avgPrice: (avgPrice !== null && !isNaN(avgPrice) && avgPrice > 0) ? avgPrice : null
        });
    }

    const key = `portfolio_${cleanName}`;
    client.set(key, JSON.stringify(sanitizedData), (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Portfolio "${cleanName}" saved successfully`, count: sanitizedData.length });
    });
});

router.get('/portfolio/:name', (req, res) => {
    const name = req.params.name;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Valid profile name is required' });
    }
    const cleanName = name.trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,40}$/.test(cleanName)) {
        return res.status(400).json({ error: 'Invalid profile name format' });
    }
    const key = `portfolio_${cleanName}`;
    client.get(key, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!data) return res.status(404).json({ error: `Portfolio "${cleanName}" not found` });
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse portfolio data' });
        }
    });
});

router.delete('/portfolio/:name', (req, res) => {
    const name = req.params.name;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Valid profile name is required' });
    }
    const cleanName = name.trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,40}$/.test(cleanName)) {
        return res.status(400).json({ error: 'Invalid profile name format' });
    }
    const key = `portfolio_${cleanName}`;
    client.del(key, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Portfolio "${cleanName}" deleted successfully` });
    });
});

module.exports = router;
