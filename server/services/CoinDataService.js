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
        this.paribuUSDT = 0;
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
                // BTCTurk pair: BTCTRY usually
                let symbol = coin.toUpperCase() + 'TRY';
                let data = await f.getBTCTurkOrderBook(symbol);
                if (data) {
                    if (!this.depthCache[coin]) this.depthCache[coin] = {};
                    this.depthCache[coin]['BTCTurk'] = data;
                }
            } else if (exchange.includes('Paribu')) {
                // Paribu market: use mapped symbol or default to coin_tl
                let symbol = this.paribuSymbolMap[coin] || (coin.toLowerCase() + '_tl');
                let data = await f.getParibuOrderBook(symbol);
                if (data && data.bids && data.asks) {
                    if (!this.depthCache[coin]) this.depthCache[coin] = {};
                    this.depthCache[coin]['Paribu'] = data;
                } else {
                    // Cache failure/empty to prevent infinite waiting
                    if (!this.depthCache[coin]) this.depthCache[coin] = {};
                    this.depthCache[coin]['Paribu'] = { error: true };
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
        let bestBuy = { price: Infinity, exchange: null, qty: null };
        let bestSell = { price: 0, exchange: null, qty: null };

        const checkBuy = (price, exchange, qty) => {
            if (price > 0 && price < bestBuy.price) {
                bestBuy = { price, exchange, qty };
            }
        };

        const checkSell = (price, exchange, qty) => {
            if (price > 0 && price > bestSell.price) {
                bestSell = { price, exchange, qty };
            }
        };

        // Check Paribu
        if (item.paribu.try?.ask) checkBuy(item.paribu.try.ask, 'Paribu', item.paribu.try.askQty);
        if (item.paribu.try?.bid) checkSell(item.paribu.try.bid, 'Paribu', item.paribu.try.bidQty);

        // Check Binance
        if (item.binance.usdt?.askInTRY) checkBuy(item.binance.usdt.askInTRY, 'Binance(USDT)', item.binance.usdt.askQty);
        if (item.binance.usdt?.bidInTRY) checkSell(item.binance.usdt.bidInTRY, 'Binance(USDT)', item.binance.usdt.bidQty);
        if (item.binance.try?.ask) checkBuy(item.binance.try.ask, 'Binance(TRY)', item.binance.try.askQty);
        if (item.binance.try?.bid) checkSell(item.binance.try.bid, 'Binance(TRY)', item.binance.try.bidQty);

        // Check BTCTurk
        if (item.BTCTurk.try?.ask) checkBuy(item.BTCTurk.try.ask, 'BTCTurk(TRY)', item.BTCTurk.try.askQty);
        if (item.BTCTurk.try?.bid) checkSell(item.BTCTurk.try.bid, 'BTCTurk(TRY)', item.BTCTurk.try.bidQty);
        if (item.BTCTurk.usdt?.askInTRY) checkBuy(item.BTCTurk.usdt.askInTRY, 'BTCTurk(USDT)', item.BTCTurk.usdt.askQty);
        if (item.BTCTurk.usdt?.bidInTRY) checkSell(item.BTCTurk.usdt.bidInTRY, 'BTCTurk(USDT)', item.BTCTurk.usdt.bidQty);


        if (bestBuy.exchange && bestSell.exchange) {
            // Initial ROI
            item.ROI = ((bestSell.price - bestBuy.price) / bestBuy.price) * 100;

            // DYNAMIC DEPTH CHECK TRIGGER
            let waitingForDepth = false;

            if (item.ROI > 3.0) {
                if (bestBuy.exchange.includes('Binance')) {
                    this.fetchDepth(coin, 'Binance');
                    if (!this.depthCache[coin]?.['Binance']) waitingForDepth = true;
                }
                if (bestBuy.exchange.includes('BTCTurk')) {
                    this.fetchDepth(coin, 'BTCTurk');
                    if (!this.depthCache[coin]?.['BTCTurk']) waitingForDepth = true;
                }
                if (bestBuy.exchange.includes('Paribu')) {
                    this.fetchDepth(coin, 'Paribu');
                    if (!this.depthCache[coin]?.['Paribu']) waitingForDepth = true;
                }

                if (bestSell.exchange.includes('Binance')) {
                    this.fetchDepth(coin, 'Binance');
                    if (!this.depthCache[coin]?.['Binance']) waitingForDepth = true;
                }
                if (bestSell.exchange.includes('BTCTurk')) {
                    this.fetchDepth(coin, 'BTCTurk');
                    if (!this.depthCache[coin]?.['BTCTurk']) waitingForDepth = true;
                }
                if (bestSell.exchange.includes('Paribu')) {
                    this.fetchDepth(coin, 'Paribu');
                    if (!this.depthCache[coin]?.['Paribu']) waitingForDepth = true;
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
                if (exchange.includes('BTCTurk') && this.depthCache[coin]?.['BTCTurk']?.[type]) return this.depthCache[coin]['BTCTurk'][type];
                if (exchange.includes('Paribu') && this.depthCache[coin]?.['Paribu']?.[type]) return this.depthCache[coin]['Paribu'][type];
                return null; // Not found in cache
            };

            // Check for Errors First (Kill Switch)
            let depthError = false;
            // Note: depthCache[coin]['Paribu'].error checks if the specific exchange key has {error:true}
            if ((bestBuy.exchange.includes('Paribu') && this.depthCache[coin]?.['Paribu']?.error) ||
                (bestSell.exchange.includes('Paribu') && this.depthCache[coin]?.['Paribu']?.error)) {
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

                // 2. If missing, Fallback to Ticker (Construct Single-Level Depth)
                // Only if Ticker Qty exists and is valid
                if (!asks && bestBuy.qty) {
                    asks = [[bestBuy.price, bestBuy.qty]];
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
                tradeAmountTRY: finalTradeStats.tradeAmountTRY, // Exact Capital Required
                profit: finalTradeStats.profit,                 // Realized Profit
                roi: item.ROI
            };

        } else {
            item.ROI = -100;
            item.arbitrageDetails = null;
        }
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

        // Filter out ROI below threshold from settings
        let totalRaw = opportunities.length;
        const minROI = (this.settings.minROI !== undefined && this.settings.minROI !== null) ? this.settings.minROI : 0.50;
        opportunities = opportunities.filter(o => o.roi >= minROI);
        let afterFilter = opportunities.length;


        // Sort by Profit (Descending)
        opportunities.sort((a, b) => b.profit - a.profit);

        // Take Top 3
        const top3 = opportunities.slice(0, 3);


        /*
                if (top3.length > 0) {
                    console.log('\n🏆 Top 3 Arbitrage Opportunities (Potential Gain based on full liquidity):');
                    top3.forEach((op, index) => {
                        console.log(`${index + 1}. [${op.coin.toUpperCase()}] Potential Gain: ₺${op.profit.toFixed(2)} | ROI: %${op.roi.toFixed(2)} | Buy: ${op.buyExchange} -> Sell: ${op.sellExchange} | Trade Vol: ₺${op.tradeAmountTRY.toFixed(0)}`);
                        
                        // Telegram Alert Trigger (Dynamic Profit threshold)
                if (op.profit >= (this.settings.minProfit || 1000)) {
                    this.checkAndSendTelegramAlert(op);
                }
            });
            console.log('--------------------------------------------------');
        }
*/

        // Always check for Telegram alerts even if logs are off
        top3.forEach((op) => {
            const minProfit = (this.settings.minProfit !== undefined && this.settings.minProfit !== null) ? this.settings.minProfit : 1000;
            if (op.profit >= minProfit) {
                this.checkAndSendTelegramAlert(op);
            }
        });
    }

    async checkAndSendTelegramAlert(op) {
        let now = Date.now();
        const configCooldown = (this.settings.cooldown !== undefined && this.settings.cooldown !== null) ? this.settings.cooldown : 5;
        let cooldown = configCooldown * 60 * 1000;

        let lastProfit = this.lastAlertProfits[op.coin] || 0;
        let isProfitIncreased = op.profit > lastProfit;

        // Condition: Send if cooldown passed OR profit increased
        if (this.lastAlertTimes[op.coin] && (now - this.lastAlertTimes[op.coin] < cooldown) && !isProfitIncreased) {
            return;
        }

        this.lastAlertTimes[op.coin] = now;
        this.lastAlertProfits[op.coin] = op.profit;

        let msg = `🪙 <b>Coin:</b> ${op.coin.toUpperCase()}\n` +
            `💰 <b>Potential Gain:</b> ₺${op.profit.toFixed(2)}\n` +
            `📈 <b>ROI:</b> %${op.roi.toFixed(2)}\n` +
            `🛒 <b>Buy:</b> ${op.buyExchange}  (@ ₺${op.buyPrice.toFixed(4)})\n` +
            `🤝 <b>Sell:</b> ${op.sellExchange} (@ ₺${op.sellPrice.toFixed(4)})\n` +
            `📊 <b>Trade Capacity:</b> ₺${op.tradeAmountTRY.toFixed(0)}`;

        try {
            await TelegramService.broadcast(msg);
        } catch (e) {
            console.error('Telegram alert failed:', e.message);
        }
    }
}

module.exports = new CoinDataService();
