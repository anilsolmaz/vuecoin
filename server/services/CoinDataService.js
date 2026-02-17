const f = require('../js/functions');
const config = require('../configs/config.json');
const redis = require("redis");
const { DateTime } = require("luxon");
require('dotenv').config({ path: __dirname + '/../../server/.env' }); // Adjust path if needed

const client = redis.createClient({
    "port": process.env.REDIS_PORT,
    "password": process.env.REDIS_PASSWORD,
    "host": process.env.REDIS_HOST
});

class CoinDataService {
    constructor() {
        this.coinList = {};
        this.paribuMarketsList = [];
        this.paribuUSDT = 0;
        this.paribuCHZ = 0;
        this.requestCount = 0;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const r = await f.getParibuInitialData();
            this.paribuMarketsList = Object.keys(JSON.parse(r).payload.markets);

            this.paribuMarketsList.forEach((key) => {
                let coinKey = key.split('_')[0];
                if (key === 'miota_tl') coinKey = 'iota';

                // Common structure
                let coinObj = {
                    "ROI": 0,
                    "fraction": (JSON.parse(r).payload.markets)[key].precisions.price,
                    "paribu": { "try": { "price": null, "inUSDT": null }, "usdt": { "price": null, "inTRY": null }, "chz": { "price": null, "inTRY": null }, "lastUpdateTime": null },
                    "binance": { "try": { "price": null, "inUSDT": null }, "usdt": { "price": null, "inTRY": null }, "lastUpdateTime": null },
                    "BTCTurk": { "try": { "price": null, "inUSDT": null }, "usdt": { "price": null, "inTRY": null }, "lastUpdateTime": null },
                    "chiliz": { "chz": { "price": null, "inTRY": null }, "usdt": { "price": null, "inTRY": null }, "lastUpdateTime": null },
                    "FTX": { "try": { "price": null, "inUSDT": null }, "usdt": { "price": null, "inTRY": null }, "lastUpdateTime": null }
                };

                this.coinList[coinKey] = coinObj;
            });

            // Post-init updates
            f.statusUpdate('Paribu Initials&markets updated');
            f.updateBTCTurkMarkets();
            f.updatePRBMarkets();
            this.initialized = true;

            // Add extra coins
            this.addExtraCoins();

        } catch (e) {
            console.log('Initial verileri alınırken hata gerçekleşti', e);
        }
    }

    addExtraCoins(finalResults) {
        let filteredParibuCoins = config.exchangeMarkets.paribu.markets.map(x => x.split('_')[0])
        let coinsLeftFromBTCTurk = f.differenceOfFirstArray(config.exchangeMarkets.BTCTurk.markets, filteredParibuCoins)

        coinsLeftFromBTCTurk = coinsLeftFromBTCTurk.filter(c => c !== 'try' && c !== 'usdc');

        const extras = ['mask', 'bnb', 'ftt', 'hft', 'hook', 'porto', 'lazio', 'santos', 'alpine', 'id', 'edu', 'pixel', 'strk', 'cyber', 'sei'];
        coinsLeftFromBTCTurk = [...coinsLeftFromBTCTurk, ...extras];

        // Deduplicate
        coinsLeftFromBTCTurk = [...new Set(coinsLeftFromBTCTurk)];

        coinsLeftFromBTCTurk.forEach(key => {
            if (!this.coinList[key]) {
                this.coinList[key] = {
                    "ROI": 0,
                    "fraction": 0,
                    "paribu": {
                        "try": { "price": null, "inUSDT": null },
                        "usdt": { "price": null, "inTRY": null },
                        "chz": { "price": null, "inTRY": null },
                        "lastUpdateTime": null
                    },
                    "binance": {
                        "try": { "price": null, "inUSDT": null },
                        "usdt": { "price": null, "inTRY": null },
                        "lastUpdateTime": null
                    },
                    "BTCTurk": {
                        "try": { "price": null, "inUSDT": null },
                        "usdt": { "price": null, "inTRY": null },
                        "lastUpdateTime": null
                    },
                    "FTX": {
                        "try": { "price": null, "inUSDT": null },
                        "usdt": { "price": null, "inTRY": null },
                        "lastUpdateTime": null
                    },
                    "chiliz": {
                        "chz": { "price": null, "inTRY": null },
                        "usdt": { "price": null, "inTRY": null },
                        "lastUpdateTime": null
                    }
                };
            }
            if (!this.coinList[key].binance) this.coinList[key].binance = { try: {}, usdt: {} };
            if (!this.coinList[key].BTCTurk) this.coinList[key].BTCTurk = { try: {}, usdt: {} };

            let upper = key.toUpperCase();
            if (finalResults && finalResults.binance) {
                // Binance returns object with price, bid, ask
                let binanceData = finalResults.binance[upper + 'USDT'];
                this.coinList[key]['binance']['usdt'] = {
                    price: binanceData ? binanceData.price : 0,
                    bid: binanceData ? binanceData.bid : 0,
                    ask: binanceData ? binanceData.ask : 0
                };

                let binanceDataTry = finalResults.binance[upper + 'TRY'];
                this.coinList[key]['binance']['try'] = {
                    price: binanceDataTry ? binanceDataTry.price : 0,
                    bid: binanceDataTry ? binanceDataTry.bid : 0,
                    ask: binanceDataTry ? binanceDataTry.ask : 0
                };
            }
            if (finalResults && finalResults.BTCTurk) {
                let btcturkData = finalResults.BTCTurk[upper + 'USDT'];
                this.coinList[key]['BTCTurk']['usdt'] = {
                    price: btcturkData ? btcturkData.price : 0,
                    bid: btcturkData ? btcturkData.bid : 0,
                    ask: btcturkData ? btcturkData.ask : 0
                };

                let btcturkDataTry = finalResults.BTCTurk[upper + 'TRY'];
                this.coinList[key]['BTCTurk']['try'] = {
                    price: btcturkDataTry ? btcturkDataTry.price : 0,
                    bid: btcturkDataTry ? btcturkDataTry.bid : 0,
                    ask: btcturkDataTry ? btcturkDataTry.ask : 0
                };
            }
        });
    }

    async refreshAllData() {
        if (!this.initialized) await this.initialize();

        this.requestCount++;
        let finalResults = {};

        let allJobs = [];
        allJobs.push(f.updateBinanceData(this.requestCount).catch(e => null));
        allJobs.push(f.updateBTCTurkData(this.requestCount).catch(e => null));
        allJobs.push(f.updateParibuData(this.requestCount).catch(e => null));

        let results = [];
        try {
            results = await Promise.all(allJobs);
        } catch (e) { console.log('Service Promise Error', e); }

        results.forEach(result => {
            if (result) {
                if (result.market) finalResults[result.market] = result;
            }
        });

        if (!finalResults.paribu) finalResults.paribu = {};
        if (!finalResults.binance) finalResults.binance = {};
        if (!finalResults.BTCTurk) finalResults.BTCTurk = {};
        if (!finalResults.chiliz) finalResults.chiliz = {};

        if (finalResults.paribu.miota) { finalResults.paribu.iota = finalResults.paribu.miota; delete finalResults.paribu.miota; }
        // User requested to rename 'a' to 'EOS(A)' for clarity
        if (finalResults.paribu.a) { finalResults.paribu['EOS(A)'] = finalResults.paribu.a; delete finalResults.paribu.a; }
        delete finalResults.paribu.mkr;
        delete finalResults.paribu.market;
        delete finalResults.paribu.tvk;
        delete finalResults.paribu.keep;
        delete finalResults.paribu.pla;

        delete finalResults.paribu.ocean;

        Object.keys(finalResults.paribu).forEach((coinName) => {
            if (coinName) {
                let coinValue = finalResults.paribu[coinName]; // Now an object { price, bid, ask }
                let coinPairUpperCase = coinName.toUpperCase();

                if (!this.coinList[coinName]) {
                    this.coinList[coinName] = { paribu: {}, binance: {}, BTCTurk: {} };
                }

                if (!this.coinList[coinName].paribu) this.coinList[coinName].paribu = {};
                this.coinList[coinName]['paribu']['lastUpdateTime'] = DateTime.local().setZone("Turkey");
                // Store price, bid, ask from Paribu
                this.coinList[coinName]['paribu']['try'] = {
                    price: coinValue.price,
                    bid: coinValue.bid,
                    ask: coinValue.ask
                };

                if (finalResults.binance) {
                    if (!this.coinList[coinName].binance) this.coinList[coinName].binance = {};
                    let binanceUSDT = finalResults.binance[coinPairUpperCase + 'USDT'];
                    let binanceTRY = finalResults.binance[coinPairUpperCase + 'TRY'];

                    this.coinList[coinName]['binance']['usdt'] = {
                        price: binanceUSDT ? binanceUSDT.price : 0,
                        bid: binanceUSDT ? binanceUSDT.bid : 0,
                        ask: binanceUSDT ? binanceUSDT.ask : 0
                    };
                    this.coinList[coinName]['binance']['try'] = {
                        price: binanceTRY ? binanceTRY.price : 0,
                        bid: binanceTRY ? binanceTRY.bid : 0,
                        ask: binanceTRY ? binanceTRY.ask : 0
                    };
                }
                if (finalResults.BTCTurk) {
                    if (!this.coinList[coinName].BTCTurk) this.coinList[coinName].BTCTurk = {};
                    let btcturkUSDT = finalResults.BTCTurk[coinPairUpperCase + 'USDT'];
                    let btcturkTRY = finalResults.BTCTurk[coinPairUpperCase + 'TRY'];

                    this.coinList[coinName]['BTCTurk']['usdt'] = {
                        price: btcturkUSDT ? btcturkUSDT.price : 0,
                        bid: btcturkUSDT ? btcturkUSDT.bid : 0,
                        ask: btcturkUSDT ? btcturkUSDT.ask : 0
                    };
                    this.coinList[coinName]['BTCTurk']['try'] = {
                        price: btcturkTRY ? btcturkTRY.price : 0,
                        bid: btcturkTRY ? btcturkTRY.bid : 0,
                        ask: btcturkTRY ? btcturkTRY.ask : 0
                    };
                }
            }
        });

        this.addExtraCoins(finalResults);

        // Calculate Rates First
        if (this.coinList['usdt']?.paribu?.try?.price) {
            this.paribuUSDT = this.coinList['usdt'].paribu.try.price;
            client.setex('paribuUSDT', config.cacheDuration, this.paribuUSDT);
        }
        if (this.coinList['chz']?.paribu?.try?.price) {
            this.paribuCHZ = this.coinList['chz'].paribu.try.price;
        }

        // Calculate Metrics
        Object.keys(this.coinList).forEach((coin) => {
            this.calculateCoinMetrics(coin);
        });

        return this.coinList;
    }

    calculateCoinMetrics(coin) {
        let item = this.coinList[coin];
        if (!item) return;

        if (!item.paribu) item.paribu = { try: {}, usdt: {} };
        if (!item.binance) item.binance = { try: {}, usdt: {} };
        if (!item.BTCTurk) item.BTCTurk = { try: {}, usdt: {} };
        if (!item.chiliz) item.chiliz = { chz: {}, usdt: {} };

        // Cross Rate Calculations
        // Cross Rate Calculations (Also convert Bids and Asks)
        // Helper to convert object safely
        const convert = (obj, rate, op) => {
            if (!obj || !obj.price) return;
            if (op === 'div') {
                obj.inUSDT = obj.price / rate;
                // Convert Bid/Ask too if they exist
                if (obj.bid) obj.bidInUSDT = obj.bid / rate;
                if (obj.ask) obj.askInUSDT = obj.ask / rate;
            } else {
                obj.inTRY = obj.price * rate;
                if (obj.bid) obj.bidInTRY = obj.bid * rate;
                if (obj.ask) obj.askInTRY = obj.ask * rate;
            }
        };

        if (item.paribu.try?.price && this.paribuUSDT) convert(item.paribu.try, this.paribuUSDT, 'div');
        if (item.paribu.usdt?.price && this.paribuUSDT) convert(item.paribu.usdt, this.paribuUSDT, 'mult');

        if (item.binance.usdt?.price && this.paribuUSDT) convert(item.binance.usdt, this.paribuUSDT, 'mult');
        if (item.binance.try?.price && this.paribuUSDT) convert(item.binance.try, this.paribuUSDT, 'div');

        if (item.BTCTurk.usdt?.price && this.paribuUSDT) convert(item.BTCTurk.usdt, this.paribuUSDT, 'mult');
        if (item.BTCTurk.try?.price && this.paribuUSDT) convert(item.BTCTurk.try, this.paribuUSDT, 'div');

        // New ROI Logic: Best Sell (Highest Bid) vs Best Buy (Lowest Ask)
        let buyOptions = [];
        let sellOptions = [];

        // Collect all valid Asks (Buy Prices) in TRY
        if (item.paribu.try?.ask) buyOptions.push(item.paribu.try.ask);
        if (item.binance.usdt?.askInTRY) buyOptions.push(item.binance.usdt.askInTRY);
        if (item.binance.try?.ask) buyOptions.push(item.binance.try.ask);
        if (item.BTCTurk.try?.ask) buyOptions.push(item.BTCTurk.try.ask);
        if (item.BTCTurk.usdt?.askInTRY) buyOptions.push(item.BTCTurk.usdt.askInTRY);

        // Collect all valid Bids (Sell Prices) in TRY
        if (item.paribu.try?.bid) sellOptions.push(item.paribu.try.bid);
        if (item.binance.usdt?.bidInTRY) sellOptions.push(item.binance.usdt.bidInTRY);
        if (item.binance.try?.bid) sellOptions.push(item.binance.try.bid);
        if (item.BTCTurk.try?.bid) sellOptions.push(item.BTCTurk.try.bid);
        if (item.BTCTurk.usdt?.bidInTRY) sellOptions.push(item.BTCTurk.usdt.bidInTRY);

        if (buyOptions.length > 0 && sellOptions.length > 0) {
            const minAsk = Math.min(...buyOptions); // Best Buy Price
            const maxBid = Math.max(...sellOptions); // Best Sell Price

            // ROI = ((Sell - Buy) / Buy) * 100
            item.ROI = ((maxBid - minAsk) / minAsk) * 100;
        } else {
            item.ROI = -100; // No valid data
        }
    }
}

module.exports = new CoinDataService();
