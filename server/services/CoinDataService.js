const f = require('../js/functions');
const config = require('../configs/config.json');
const { DateTime } = require("luxon");
const TelegramService = require('./TelegramService');

// Unified Redis Service
const client = require('./RedisService');

class CoinDataService {
    constructor() {
        this.coinList = {};
        this.paribuMarketsList = [];
        this.paribuUSDT = 0;
        this.btcturkUSDT = 0;
        this.paribuCHZ = 0;
        this.paribuSymbolMap = {}; // Map internal coin name to Paribu market key
        this.requestCount = 0;
        this.initialized = false;
        this.depthCache = {};
        this.depthTimestamps = {};
        this.lastAlertTimes = {}; // For Telegram cooldown
        this.lastAlertProfits = {}; // To detect profit increases
        this.settings = {
            cooldown: 5,
            minProfit: 1000,
            minROI: 0.50
        };
    }

    async initialize() {
        if (this.initialized) return;
        await this.loadSettings();

        try {
            const r = await f.getParibuInitialData();
            this.paribuMarketsList = Object.keys(JSON.parse(r).payload.markets);

            this.paribuMarketsList.forEach((key) => {
                let coinKey = key.split('_')[0];
                if (key === 'miota_tl') coinKey = 'iota';

                this.paribuSymbolMap[coinKey] = key;

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

    async loadSettings() {
        return new Promise((resolve) => {
            if (process.env.NODE_ENV === 'test') return resolve();

            client.get('arb_settings', (err, reply) => {
                if (err) {
                    return resolve();
                }
                if (reply) {
                    try {
                        this.settings = JSON.parse(reply);
                    } catch (e) {
                        // Ignore parse error
                    }
                }
                resolve();
            });
        });
    }

    async refreshAllData() {
        if (!this.initialized) await this.initialize();

        // Refresh settings every 10 requests to catch updates from UI
        if (this.requestCount % 10 === 0) {
            await this.loadSettings();
        }

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
                    bidQty: coinValue.bidQty,
                    ask: coinValue.ask,
                    askQty: coinValue.askQty
                };

                if (finalResults.binance) {
                    if (!this.coinList[coinName].binance) this.coinList[coinName].binance = {};
                    let binanceUSDT = finalResults.binance[coinPairUpperCase + 'USDT'];
                    let binanceTRY = finalResults.binance[coinPairUpperCase + 'TRY'];

                    this.coinList[coinName]['binance']['usdt'] = {
                        price: binanceUSDT ? binanceUSDT.price : 0,
                        bid: binanceUSDT ? binanceUSDT.bid : 0,
                        bidQty: binanceUSDT ? binanceUSDT.bidQty : 0,
                        ask: binanceUSDT ? binanceUSDT.ask : 0,
                        askQty: binanceUSDT ? binanceUSDT.askQty : 0
                    };
                    this.coinList[coinName]['binance']['try'] = {
                        price: binanceTRY ? binanceTRY.price : 0,
                        bid: binanceTRY ? binanceTRY.bid : 0,
                        bidQty: binanceTRY ? binanceTRY.bidQty : 0,
                        ask: binanceTRY ? binanceTRY.ask : 0,
                        askQty: binanceTRY ? binanceTRY.askQty : 0
                    };
                }
                if (finalResults.BTCTurk) {
                    if (!this.coinList[coinName].BTCTurk) this.coinList[coinName].BTCTurk = {};
                    let btcturkUSDT = finalResults.BTCTurk[coinPairUpperCase + 'USDT'];
                    let btcturkTRY = finalResults.BTCTurk[coinPairUpperCase + 'TRY'];

                    this.coinList[coinName]['BTCTurk']['usdt'] = {
                        price: btcturkUSDT ? btcturkUSDT.price : 0,
                        bid: btcturkUSDT ? btcturkUSDT.bid : 0,
                        bidQty: btcturkUSDT ? btcturkUSDT.bidQty : 0,
                        ask: btcturkUSDT ? btcturkUSDT.ask : 0,
                        askQty: btcturkUSDT ? btcturkUSDT.askQty : 0

                    };
                    this.coinList[coinName]['BTCTurk']['try'] = {
                        price: btcturkTRY ? btcturkTRY.price : 0,
                        bid: btcturkTRY ? btcturkTRY.bid : 0,
                        bidQty: btcturkTRY ? btcturkTRY.bidQty : 0,
                        ask: btcturkTRY ? btcturkTRY.ask : 0,
                        askQty: btcturkTRY ? btcturkTRY.askQty : 0
                    };
                }
            }
        });

        this.addExtraCoins(finalResults);

        // Calculate Rates First
        if (this.coinList['usdt']?.paribu?.try?.price) {
            this.paribuUSDT = this.coinList['usdt'].paribu.try.price;
            client.setex('paribuUSDT', config.cacheDuration, this.paribuUSDT);
        } else if (process.env.NODE_ENV === 'test') {
            // Mock value for tests
            this.paribuUSDT = 10;
        }

        this.paribuCHZ = 0;
        if (this.coinList['chz']?.paribu?.try?.price) {
            this.paribuCHZ = this.coinList['chz'].paribu.try.price;
        }

        this.btcturkUSDT = 0;
        if (this.coinList['usdt']?.BTCTurk?.try?.price) {
            this.btcturkUSDT = this.coinList['usdt'].BTCTurk.try.price;
        }

        // Calculate Metrics
        Object.keys(this.coinList).forEach((coin) => {
            this.calculateCoinMetrics(coin);
        });

        this.logTopOpportunities();

        return this.coinList;
    }

    async fetchDepth(coin, exchange) {
        let now = Date.now();
        // Prevent frequent fetching (limit to once per 3 seconds per coin/exchange)
        if (this.depthTimestamps[`${coin}_${exchange}`] && (now - this.depthTimestamps[`${coin}_${exchange}`] < 3000)) {
            return;
        }

        this.depthTimestamps[`${coin}_${exchange}`] = now;

        try {
            if (exchange.includes('Binance')) {
                // Binance symbol usually like BTCUSDT. We need to know which pair caused the arb.
                // But simplified: fetch USDT pair depth as it's most liquid/likely.
                let symbol = coin.toUpperCase() + 'USDT';
                let data = await f.getBinanceOrderBook(symbol);
                if (data) {
                    if (!this.depthCache[coin]) this.depthCache[coin] = {};
                    this.depthCache[coin]['Binance'] = data;
                }
            } else if (exchange.includes('BTCTurk')) {
                // Determine pair based on exchange identifier
                let suffix = exchange.includes('USDT') ? 'USDT' : 'TRY';
                let symbol = coin.toUpperCase() + suffix;
                let data = await f.getBTCTurkOrderBook(symbol);
                if (data) {
                    if (!this.depthCache[coin]) this.depthCache[coin] = {};
                    this.depthCache[coin][exchange] = data; // Cache under 'BTCTurk(TRY)' or 'BTCTurk(USDT)'
                }
            } else if (exchange.includes('Paribu')) {
                // Paribu(TRY) or Paribu(USDT)
                let suffix = '_tl';
                if (exchange.includes('USDT')) suffix = '_usdt';

                // Resolve Symbol
                // Try to find base from map (e.g. iota -> miota_tl)
                let mapped = this.paribuSymbolMap[coin];
                let symbol = '';

                if (mapped) {
                    // if mapped is miota_tl, and we want usdt => miota_usdt
                    let base = mapped.split('_')[0];
                    symbol = base + suffix;
                } else {
                    symbol = coin.toLowerCase() + suffix;
                }

                let data = await f.getParibuOrderBook(symbol);

                if (!this.depthCache[coin]) this.depthCache[coin] = {};

                if (data && data.bids && data.asks) {
                    this.depthCache[coin][exchange] = data; // Cache under 'Paribu(TRY)' or 'Paribu(USDT)'
                } else {
                    // Cache failure/empty to prevent infinite waiting
                    this.depthCache[coin][exchange] = { error: true };
                }
            }
        } catch (e) {
            console.error(`Depth fetch failed for ${coin} on ${exchange}`);
            // Cache error
            if (!this.depthCache[coin]) this.depthCache[coin] = {};
            this.depthCache[coin][exchange] = { error: true };
        }
    }

    calculateOrderBookMatch(asks, bids) {
        // Sort ASKS (Best Buy = Lowest Price First)
        let sortedAsks = [...asks].map(a => ({ price: parseFloat(a[0]), qty: parseFloat(a[1]) })).sort((a, b) => a.price - b.price);
        // Sort BIDS (Best Sell = Highest Price First)
        let sortedBids = [...bids].map(b => ({ price: parseFloat(b[0]), qty: parseFloat(b[1]) })).sort((a, b) => b.price - a.price);

        let totalCost = 0;
        let totalRevenue = 0;
        let totalVolume = 0;

        let i = 0; // Ask index
        let j = 0; // Bid index

        while (i < sortedAsks.length && j < sortedBids.length) {
            let ask = sortedAsks[i];
            let bid = sortedBids[j];

            // Arbitrage Condition: Buy Price < Sell Price (Profitable?)
            // If we buy at 6.07 and sell at 6.03, we lose.
            // The loop should stop when ask.price >= bid.price (No more gap)
            if (ask.price >= bid.price) {
                break;
            }

            // Determine matchable quantity
            let tradeQty = Math.min(ask.qty, bid.qty);

            // Accumulate Stats
            totalCost += tradeQty * ask.price;
            totalRevenue += tradeQty * bid.price;
            totalVolume += tradeQty;

            // Update remaining quantities (local copies)
            ask.qty -= tradeQty;
            bid.qty -= tradeQty;

            // Move indices if fully consumed
            if (ask.qty <= 0.00000001) i++;
            if (bid.qty <= 0.00000001) j++;
        }

        let totalProfit = totalRevenue - totalCost;
        let avgBuyPrice = totalVolume > 0 ? (totalCost / totalVolume) : 0;
        let avgSellPrice = totalVolume > 0 ? (totalRevenue / totalVolume) : 0;

        return {
            tradeAmountTRY: totalCost, // This is the required capital (Capacity)
            profit: totalProfit,
            avgBuyPrice,
            avgSellPrice,
            totalVolume
        };
    }

    calculateCoinMetrics(coin) {
        let item = this.coinList[coin];
        if (!item) return;

        if (!item.paribu) item.paribu = { try: {}, usdt: {} };
        if (!item.binance) item.binance = { try: {}, usdt: {} };
        if (!item.BTCTurk) item.BTCTurk = { try: {}, usdt: {} };
        if (!item.chiliz) item.chiliz = { chz: {}, usdt: {} };

        // Cross Rate Calculations
        const convert = (obj, rate, op) => {
            if (!obj || !obj.price) return;
            if (op === 'div') {
                obj.inUSDT = obj.price / rate;
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

        let btcRate = this.btcturkUSDT || this.paribuUSDT;
        if (item.BTCTurk.usdt?.price && btcRate) convert(item.BTCTurk.usdt, btcRate, 'mult');
        if (item.BTCTurk.try?.price && btcRate) convert(item.BTCTurk.try, btcRate, 'div');

        // Initialize Arbitrage Data
        let bestBuy = { price: Infinity, rawPrice: 0, exchange: null, qty: null };
        let bestSell = { price: 0, rawPrice: 0, exchange: null, qty: null };

        const checkBuy = (price, exchange, qty, rawPrice) => {
            if (price > 0 && price < bestBuy.price) {
                bestBuy = { price, rawPrice: rawPrice || price, exchange, qty };
            }
        };

        const checkSell = (price, exchange, qty, rawPrice) => {
            if (price > 0 && price > bestSell.price) {
                bestSell = { price, rawPrice: rawPrice || price, exchange, qty };
            }
        };

        // Check Paribu (Detect both TRY and USDT pairs)
        // rawPrice: TRY pairs pass raw TRY, USDT pairs pass raw USDT
        if (item.paribu.try?.ask) checkBuy(item.paribu.try.ask, 'Paribu(TRY)', item.paribu.try.askQty, item.paribu.try.ask);
        if (item.paribu.try?.bid) checkSell(item.paribu.try.bid, 'Paribu(TRY)', item.paribu.try.bidQty, item.paribu.try.bid);

        if (item.paribu.usdt?.askInTRY) checkBuy(item.paribu.usdt.askInTRY, 'Paribu(USDT)', item.paribu.usdt.askQty, item.paribu.usdt.ask);
        if (item.paribu.usdt?.bidInTRY) checkSell(item.paribu.usdt.bidInTRY, 'Paribu(USDT)', item.paribu.usdt.bidQty, item.paribu.usdt.bid);

        // Check Binance
        if (item.binance.usdt?.askInTRY) checkBuy(item.binance.usdt.askInTRY, 'Binance(USDT)', item.binance.usdt.askQty, item.binance.usdt.ask);
        if (item.binance.usdt?.bidInTRY) checkSell(item.binance.usdt.bidInTRY, 'Binance(USDT)', item.binance.usdt.bidQty, item.binance.usdt.bid);
        if (item.binance.try?.ask) checkBuy(item.binance.try.ask, 'Binance(TRY)', item.binance.try.askQty, item.binance.try.ask);
        if (item.binance.try?.bid) checkSell(item.binance.try.bid, 'Binance(TRY)', item.binance.try.bidQty, item.binance.try.bid);

        // Check BTCTurk
        if (item.BTCTurk.try?.ask) checkBuy(item.BTCTurk.try.ask, 'BTCTurk(TRY)', item.BTCTurk.try.askQty, item.BTCTurk.try.ask);
        if (item.BTCTurk.try?.bid) checkSell(item.BTCTurk.try.bid, 'BTCTurk(TRY)', item.BTCTurk.try.bidQty, item.BTCTurk.try.bid);
        if (item.BTCTurk.usdt?.askInTRY) checkBuy(item.BTCTurk.usdt.askInTRY, 'BTCTurk(USDT)', item.BTCTurk.usdt.askQty, item.BTCTurk.usdt.ask);
        if (item.BTCTurk.usdt?.bidInTRY) checkSell(item.BTCTurk.usdt.bidInTRY, 'BTCTurk(USDT)', item.BTCTurk.usdt.bidQty, item.BTCTurk.usdt.bid);


        if (bestBuy.exchange && bestSell.exchange) {
            // Initial ROI
            item.ROI = ((bestSell.price - bestBuy.price) / bestBuy.price) * 100;

            // DYNAMIC DEPTH CHECK TRIGGER
            let waitingForDepth = false;
            // Use user setting or default low threshold to ensure we capture all potential deals
            let depthTrigger = (this.settings.minROI !== undefined) ? this.settings.minROI : 0.5;

            // Allow slightly lower than minROI to catch near-misses
            if (item.ROI >= depthTrigger) {
                // Fetch depth for the specific winning exchange/pair
                // IMPORTANT: Use the full exchange identifier (e.g. 'BTCTurk(USDT)', 'Paribu(TRY)')
                // so the cache key matches what fetchDepth stores.
                const triggerDepth = (exchange) => {
                    this.fetchDepth(coin, exchange);
                    // Check if depth data is available under the exchange key
                    if (!this.depthCache[coin]?.[exchange]) {
                        // For Binance, depth is always stored under 'Binance'
                        if (exchange.includes('Binance') && this.depthCache[coin]?.['Binance']) return;
                        waitingForDepth = true;
                    }
                };

                triggerDepth(bestBuy.exchange);
                if (bestSell.exchange !== bestBuy.exchange) {
                    triggerDepth(bestSell.exchange);
                }
            }

            // If we are waiting for depth data to populate, SKIP calculation this cycle.
            // This prevents "Fake" 100k volume alerts before data arrives.
            // Exception: If cache contains {error:true}, we proceed (will use fallback).
            if (waitingForDepth) {
                // Check if the "missing" cache is actually an error? 
                // Note: !this.depthCache[coin]?.['Paribu'] covers both undefined and null.
                // But if it's {error:true}, it IS truthy. So waitingForDepth would be FALSE.
                // So this logic works perfectly:
                // undefined -> waitingForDepth = true -> Return
                // {error:true} -> waitingForDepth = false -> Proceed -> Fallback
                // Data -> waitingForDepth = false -> Proceed -> Real Volume
                return;
            }

            // Profit Calculation (UNLIMITED Budget - Based on Market Capacity)
            let effectiveBuyPrice = bestBuy.price;
            let effectiveSellPrice = bestSell.price;
            let maxTradableCoin = Infinity;

            // -------------------------------------------------------------
            // ORDER BOOK MATCHING ENGINE (Real Trade Simulation)
            // -------------------------------------------------------------

            let finalTradeStats = {
                tradeAmountTRY: 0,
                profit: 0,
                avgBuyPrice: bestBuy.price,
                avgSellPrice: bestSell.price,
                totalVolume: 0
            };

            // Helper to get normalized depth
            const getDepth = (type, exchange) => {
                // type: 'asks' or 'bids'
                if (exchange.includes('Binance') && this.depthCache[coin]?.['Binance']?.[type]) return this.depthCache[coin]['Binance'][type];
                if (exchange.includes('BTCTurk')) {
                    // Try explicit key first (BTCTurk(TRY), BTCTurk(USDT))
                    if (this.depthCache[coin]?.[exchange]?.[type]) return this.depthCache[coin][exchange][type];
                    // Fallback to legacy 'BTCTurk' key
                    if (this.depthCache[coin]?.['BTCTurk']?.[type]) return this.depthCache[coin]['BTCTurk'][type];
                }
                // For Paribu, we likely have explicit keys depending on pair (TRY/USDT)
                if (exchange.includes('Paribu')) {
                    // Try explicit key first (Paribu(TRY), Paribu(USDT))
                    if (this.depthCache[coin]?.[exchange]?.[type]) return this.depthCache[coin][exchange][type];
                    // Fallback to legacy 'Paribu' key (just in case)
                    if (this.depthCache[coin]?.['Paribu']?.[type]) return this.depthCache[coin]['Paribu'][type];
                }
                return null; // Not found in cache
            };

            // Check for Errors First (Kill Switch)
            let depthError = false;
            // Check if depth data fetched with error for any involved exchange
            if (this.depthCache[coin]?.[bestBuy.exchange]?.error ||
                this.depthCache[coin]?.[bestSell.exchange]?.error) {
                depthError = true;
            }

            if (depthError) {
                // Kill Switch Active
                finalTradeStats.tradeAmountTRY = 0;
                finalTradeStats.profit = 0;
            } else {
                // 1. Try to get Real Depth
                let asks = getDepth('asks', bestBuy.exchange);
                let bids = getDepth('bids', bestSell.exchange);

                // NORMALIZE CURRENCIES TO TRY
                // The Matching Engine operates in TRY. If an order book is in USDT, 
                // we must convert its Price levels to TRY.
                // Note: Qty is usually in Coin (e.g. BTC), so it stays same.
                // Exception: Some exchanges might have quote-currency qty? Assuming Base Coin Qty for now.

                const normalize = (book, exchange) => {
                    if (!book) return null;
                    // Check if source is USDT
                    // Paribu(USDT) is definitely USDT.
                    // Binance is always USDT in our fetchDepth implementation.
                    let isUSDT = exchange.includes('USDT') || exchange.includes('Binance');

                    // Binance depth is always USDT (fetched as coinUSDT).
                    // BTCTurk and Paribu now fetch the correct pair based on exchange identifier.
                    // So BTCTurk(USDT) returns USDT depth, BTCTurk(TRY) returns TRY depth.

                    if (isUSDT) {
                        let rate = this.paribuUSDT || 30; // Fallback if 0
                        // Deep Copy & Convert Price (index 0)
                        return book.map(level => [
                            parseFloat(level[0]) * rate, // Price * Rate
                            parseFloat(level[1])         // Qty
                        ]);
                    }
                    return book; // Return as is (assuming TRY)
                };

                asks = normalize(asks, bestBuy.exchange);
                bids = normalize(bids, bestSell.exchange);

                // 2. If missing, Fallback to Ticker (Construct Single-Level Depth)
                // Only if Ticker Qty exists and is valid
                if (!asks && bestBuy.qty) {
                    asks = [[bestBuy.price, bestBuy.qty]]; // Top level is already converted/normalized in 'bestBuy'
                }
                if (!bids && bestSell.qty) {
                    bids = [[bestSell.price, bestSell.qty]];
                }

                // 3. Run Matching Engine if we have data
                if (asks && bids && asks.length > 0 && bids.length > 0) {
                    finalTradeStats = this.calculateOrderBookMatch(asks, bids);
                }
                // If still no stats (e.g. empty depth or no ticker qty), explicit 0 is maintained.
            }

            // Reporting
            item.arbitrageDetails = {
                buyExchange: bestBuy.exchange,
                sellExchange: bestSell.exchange,
                buyPrice: finalTradeStats.avgBuyPrice || effectiveBuyPrice,
                sellPrice: finalTradeStats.avgSellPrice || effectiveSellPrice,
                buyPriceRaw: bestBuy.rawPrice,   // Original currency price (TRY or USDT)
                sellPriceRaw: bestSell.rawPrice,  // Original currency price (TRY or USDT)
                tradeAmountTRY: finalTradeStats.tradeAmountTRY,
                profit: finalTradeStats.profit,
                roi: item.ROI
            };

        } else {
            item.ROI = -100;
            item.arbitrageDetails = null;
        }
    }

    /**
     * Helper: extract base exchange name from identifier
     * e.g. 'Paribu(TRY)' -> 'Paribu', 'Binance(USDT)' -> 'Binance'
     */
    getBaseExchange(exchange) {
        if (!exchange) return '';
        return exchange.split('(')[0];
    }

    isSameExchange(op) {
        return this.getBaseExchange(op.buyExchange) === this.getBaseExchange(op.sellExchange);
    }

    logTopOpportunities() {
        let opportunities = [];
        Object.keys(this.coinList).forEach(key => {
            if (this.coinList[key].arbitrageDetails) {
                opportunities.push({
                    coin: key,
                    ...this.coinList[key].arbitrageDetails
                });
            }
        });

        // Separate same-exchange and cross-exchange opportunities
        const sameExchange = opportunities.filter(o => this.isSameExchange(o) && o.roi > 0);
        const crossExchange = opportunities.filter(o => !this.isSameExchange(o));

        // --- SAME-EXCHANGE: No minROI, no minProfit filter ---
        // Sort by profit descending, send all
        sameExchange.sort((a, b) => b.profit - a.profit);
        sameExchange.forEach((op) => {
            this.checkAndSendTelegramAlert(op, true); // true = same-exchange mode
        });

        // --- CROSS-EXCHANGE: Apply existing filters ---
        const minROI = (this.settings.minROI !== undefined && this.settings.minROI !== null) ? this.settings.minROI : 0.50;
        const filteredCross = crossExchange.filter(o => o.roi >= minROI);

        filteredCross.sort((a, b) => b.profit - a.profit);
        const top3 = filteredCross.slice(0, 3);

        top3.forEach((op) => {
            const minProfit = (this.settings.minProfit !== undefined && this.settings.minProfit !== null) ? this.settings.minProfit : 1000;
            if (op.profit >= minProfit) {
                this.checkAndSendTelegramAlert(op, false);
            }
        });
    }

    async checkAndSendTelegramAlert(op, isSameExchange = false) {
        let now = Date.now();

        // Use 5-min cooldown for all alerts
        const configCooldown = (this.settings.cooldown !== undefined && this.settings.cooldown !== null) ? this.settings.cooldown : 5;
        let cooldown = configCooldown * 60 * 1000;

        // Separate cooldown tracking for same-exchange vs cross-exchange
        const cooldownKey = isSameExchange ? `intra_${op.coin}` : op.coin;

        let lastProfit = this.lastAlertProfits[cooldownKey] || 0;
        let isProfitIncreased = op.profit > lastProfit;

        // Condition: Send if cooldown passed OR profit increased (better deal)
        if (this.lastAlertTimes[cooldownKey] && (now - this.lastAlertTimes[cooldownKey] < cooldown) && !isProfitIncreased) {
            return;
        }

        this.lastAlertTimes[cooldownKey] = now;
        this.lastAlertProfits[cooldownKey] = op.profit;

        // Format helper: 1234.56 -> "1,234.56" (only left of dot)
        const formatParts = (n, d) => {
            const parts = n.toFixed(d).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join('.');
        };
        const fmt = (n) => formatParts(n, 2);
        const fmt4 = (n) => formatParts(n, 4);
        const fmt0 = (n) => formatParts(n, 0);

        // SANITY CHECK: If buy/sell prices don't match ROI, something is wrong with normalization
        if (op.buyPrice > 0 && op.sellPrice > 0) {
            let alertROI = ((op.sellPrice - op.buyPrice) / op.buyPrice) * 100;
            if (Math.abs(alertROI - op.roi) > Math.abs(op.roi) * 10) {
                console.warn(`⚠️ Skipping bogus alert for ${op.coin}: Alert ROI ${alertROI.toFixed(2)}% vs Ticker ROI ${op.roi.toFixed(2)}%`);
                return;
            }
        }

        // Header line only for intra-exchange deals, with the exchange name
        let msg = '';
        if (isSameExchange) {
            const exchangeName = this.getBaseExchange(op.buyExchange);
            msg += `<b># ${exchangeName} Deal #</b>\n`;
        }

        // Show prices in their native currency: $ for USDT pairs, ₺ for TRY pairs
        const buyCurrency = op.buyExchange.includes('USDT') ? '$' : '₺';
        const sellCurrency = op.sellExchange.includes('USDT') ? '$' : '₺';
        const buyDisplay = op.buyPriceRaw || op.buyPrice;
        const sellDisplay = op.sellPriceRaw || op.sellPrice;

        msg += `🪙 <b>${op.coin.toUpperCase()}</b> | %${op.roi.toFixed(2)}\n` +
            `💰 <b>Potential Gain:</b> ₺${fmt(op.profit)}\n` +
            `🛒 <b>Buy:</b> ${op.buyExchange}  (@ ${buyCurrency}${fmt4(buyDisplay)})\n` +
            `🤝 <b>Sell:</b> ${op.sellExchange} (@ ${sellCurrency}${fmt4(sellDisplay)})\n` +
            `📊 <b>Trade Capacity:</b> ₺${fmt0(op.tradeAmountTRY)}`;

        try {
            await TelegramService.broadcast(msg);
        } catch (e) {
            console.error('Telegram alert failed:', e.message);
        }
    }
}

module.exports = new CoinDataService();
