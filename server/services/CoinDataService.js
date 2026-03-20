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
        this.paribuUSDT = { price: 0, bid: 0, ask: 0 };
        this.btcturkUSDT = { price: 0, bid: 0, ask: 0 };
        this.binanceUSDT = { price: 0, bid: 0, ask: 0 }; // We technically get Binance TRY/USDT
        this.paribuCHZ = 0;
        this.paribuSymbolMap = {}; // Map internal coin name to Paribu market key
        this.requestCount = 0;
        this.initialized = false;
        this.depthCache = {};
        this.depthTimestamps = {};
        this.lastAlertTimes = {}; // For Telegram cooldown
        this.lastAlertProfits = {}; // To detect profit increases
        this.settings = {
            globalCooldown: 5,
            crossMinProfit: 1000,
            crossMinROI: 0.50,
            intraMinROI: 0,
            intraMinProfit: 100
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
                    "fraction": (() => {
                        let f = 4;
                        if (this.BTCTurkInitials && this.BTCTurkInitials.data) {
                            let btcPair = this.BTCTurkInitials.data.find(x => x.pair === key.toUpperCase() + 'TRY');
                            if (btcPair && btcPair.displayFormat) {
                                let decimals = btcPair.displayFormat.split('.')[1];
                                if (decimals) return decimals.length;
                            }
                        }
                        if (this.paribuInitials) {
                            let pKey = key + '_tl';
                            let pPair = typeof this.paribuInitials === 'object' ? this.paribuInitials[pKey] : null;
                            if (pPair && pPair.precisions && pPair.precisions.price !== undefined) {
                                return pPair.precisions.price;
                            }
                        }
                        return f;
                    })(),
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

        // Fix Bug 3: If an exchange API failed (returned null), reset its stale prices
        // to prevent false arbitrage signals from temporal mismatches.
        const exchangeKeys = [
            { resultKey: 'paribu', coinKey: 'paribu' },
            { resultKey: 'binance', coinKey: 'binance' },
            { resultKey: 'BTCTurk', coinKey: 'BTCTurk' }
        ];
        exchangeKeys.forEach(({ resultKey, coinKey }) => {
            // Check if exchange returned no coin data (only has 'market' key or is empty)
            const exData = finalResults[resultKey];
            const hasCoinData = Object.keys(exData).some(k => k !== 'market');
            if (!hasCoinData) {
                Object.keys(this.coinList).forEach(coin => {
                    if (this.coinList[coin][coinKey]) {
                        if (this.coinList[coin][coinKey].try) {
                            this.coinList[coin][coinKey].try = { price: null, bid: 0, ask: 0 };
                        }
                        if (this.coinList[coin][coinKey].usdt) {
                            this.coinList[coin][coinKey].usdt = { price: null, bid: 0, ask: 0 };
                        }
                    }
                });
            }
        });

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
            this.paribuUSDT = {
                price: this.coinList['usdt'].paribu.try.price,
                bid: this.coinList['usdt'].paribu.try.bid,
                ask: this.coinList['usdt'].paribu.try.ask
            };
            // Default to price if bid/ask are 0 or missing
            if (!this.paribuUSDT.bid) this.paribuUSDT.bid = this.paribuUSDT.price;
            if (!this.paribuUSDT.ask) this.paribuUSDT.ask = this.paribuUSDT.price;

            client.setex('paribuUSDT', config.cacheDuration, this.paribuUSDT.price);
        }

        if (this.coinList['usdt']?.binance?.try?.price) {
            this.binanceUSDT = {
                price: this.coinList['usdt'].binance.try.price,
                bid: this.coinList['usdt'].binance.try.bid,
                ask: this.coinList['usdt'].binance.try.ask
            };
            if (!this.binanceUSDT.bid) this.binanceUSDT.bid = this.binanceUSDT.price;
            if (!this.binanceUSDT.ask) this.binanceUSDT.ask = this.binanceUSDT.price;
        }

        this.paribuCHZ = 0;
        if (this.coinList['chz']?.paribu?.try?.price) {
            this.paribuCHZ = this.coinList['chz'].paribu.try.price;
        }

        this.btcturkUSDT = { price: 0, bid: 0, ask: 0 };
        if (this.coinList['usdt']?.BTCTurk?.try?.price) {
            this.btcturkUSDT = {
                price: this.coinList['usdt'].BTCTurk.try.price,
                bid: this.coinList['usdt'].BTCTurk.try.bid,
                ask: this.coinList['usdt'].BTCTurk.try.ask
            };
            if (!this.btcturkUSDT.bid) this.btcturkUSDT.bid = this.btcturkUSDT.price;
            if (!this.btcturkUSDT.ask) this.btcturkUSDT.ask = this.btcturkUSDT.price;
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
                let suffix = exchange.includes('USDT') ? 'USDT' : 'TRY';
                let symbol = coin.toUpperCase() + suffix;
                let data = await f.getBinanceOrderBook(symbol);
                if (data) {
                    if (!this.depthCache[coin]) this.depthCache[coin] = {};
                    this.depthCache[coin][exchange] = data; // Cache under 'Binance(TRY)' or 'Binance(USDT)'
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

    calculateOrderBookMatch(asks, bids, maxBudget = Infinity) {
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

            // 1. Arbitrage Condition: Buy Price < Sell Price
            if (ask.price >= bid.price) break;

            // 2. Budget Limit (If applicable)
            let remainingBudget = maxBudget - totalCost;
            if (remainingBudget <= 0) break;

            // 3. Determine matchable quantity
            let tradeQty = Math.min(ask.qty, bid.qty);

            // Check if this trade exceeds remaining budget
            if (tradeQty * ask.price > remainingBudget) {
                tradeQty = remainingBudget / ask.price;
            }

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
        let effectiveROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

        return {
            tradeAmountTRY: totalCost,
            profit: totalProfit,
            avgBuyPrice,
            avgSellPrice,
            totalVolume,
            effectiveROI
        };
    }

    calculateCoinMetrics(coin) {
        let item = this.coinList[coin];
        if (!item) return;

        if (!item.paribu) item.paribu = { try: {}, usdt: {} };
        if (!item.binance) item.binance = { try: {}, usdt: {} };
        if (!item.BTCTurk) item.BTCTurk = { try: {}, usdt: {} };
        if (!item.chiliz) item.chiliz = { chz: {}, usdt: {} };

        // Cross Rate Calculations: Bid/Ask aware logic
        // If converting USDT to TRY (mult): we are selling/buying USDT
        // If converting TRY to USDT (div): we are selling/buying TRY
        const convert = (obj, usdtRateObj, op) => {
            if (!obj || !obj.price || !usdtRateObj || !usdtRateObj.price) return;

            // To be safe, fallback to general price if bid/ask missing
            let rBid = usdtRateObj.bid || usdtRateObj.price;
            let rAsk = usdtRateObj.ask || usdtRateObj.price;

            if (op === 'div') {
                // TRY to USDT 
                // We have TRY.
                // askInUSDT: we want to BUY the coin. It costs TRY. We must SELL USDT to get that TRY.
                // How much USDT do we sell? -> TRY Cost / (USDT/TRY Bid)
                if (obj.ask) obj.askInUSDT = obj.ask / rBid;
                // bidInUSDT: we want to SELL the coin. We get TRY. We must BUY USDT with that TRY.
                // How much USDT do we get? -> TRY Rev / (USDT/TRY Ask)
                if (obj.bid) obj.bidInUSDT = obj.bid / rAsk;

                // Keep .inUSDT for legacy display support
                obj.inUSDT = obj.price / usdtRateObj.price;
            } else {
                // USDT to TRY
                // We have USDT. 
                // askInTRY: we want to BUY the coin. It costs USDT. We must BUY that USDT with TRY.
                // How much TRY does it cost? -> USDT Cost * (USDT/TRY Ask)
                if (obj.ask) obj.askInTRY = obj.ask * rAsk;
                // bidInTRY: we want to SELL the coin. We get USDT. We must SELL that USDT for TRY.
                // How much TRY do we get? -> USDT Rev * (USDT/TRY Bid)
                if (obj.bid) obj.bidInTRY = obj.bid * rBid;

                // Keep .inTRY for legacy display support
                obj.inTRY = obj.price * usdtRateObj.price;
            }
        };

        // Note: use the exchange's own specific USDT/TRY rate if available. DO NOT fallback across exchanges.
        if (item.paribu.try?.price) convert(item.paribu.try, this.paribuUSDT, 'div');
        if (item.paribu.usdt?.price) convert(item.paribu.usdt, this.paribuUSDT, 'mult');

        if (item.binance.usdt?.price) convert(item.binance.usdt, this.binanceUSDT, 'mult');
        if (item.binance.try?.price) convert(item.binance.try, this.binanceUSDT, 'div');

        if (item.BTCTurk.usdt?.price) convert(item.BTCTurk.usdt, this.btcturkUSDT, 'mult');
        if (item.BTCTurk.try?.price) convert(item.BTCTurk.try, this.btcturkUSDT, 'div');

        // Initialize Arbitrage Data
        let buys = [];
        let sells = [];

        const checkBuy = (price, exchange, qty, rawPrice) => {
            if (price > 0) {
                buys.push({ price, rawPrice: rawPrice || price, exchange, qty });
            }
        };

        const checkSell = (price, exchange, qty, rawPrice) => {
            if (price > 0) {
                sells.push({ price, rawPrice: rawPrice || price, exchange, qty });
            }
        };

        // Check Paribu (Detect ONLY TRY pairs as requested)
        // rawPrice: TRY pairs pass raw TRY, USDT pairs pass raw USDT
        if (item.paribu.try?.ask) checkBuy(item.paribu.try.ask, 'Paribu(TRY)', item.paribu.try.askQty, item.paribu.try.ask);
        if (item.paribu.try?.bid) checkSell(item.paribu.try.bid, 'Paribu(TRY)', item.paribu.try.bidQty, item.paribu.try.bid);

        // Check Binance (ONLY USDT pairs)
        if (item.binance.usdt?.askInTRY) checkBuy(item.binance.usdt.askInTRY, 'Binance(USDT)', item.binance.usdt.askQty, item.binance.usdt.ask);
        if (item.binance.usdt?.bidInTRY) checkSell(item.binance.usdt.bidInTRY, 'Binance(USDT)', item.binance.usdt.bidQty, item.binance.usdt.bid);

        // Check BTCTurk (ONLY TRY pairs)
        if (item.BTCTurk.try?.ask) checkBuy(item.BTCTurk.try.ask, 'BTCTurk(TRY)', item.BTCTurk.try.askQty, item.BTCTurk.try.ask);
        if (item.BTCTurk.try?.bid) checkSell(item.BTCTurk.try.bid, 'BTCTurk(TRY)', item.BTCTurk.try.bidQty, item.BTCTurk.try.bid);


        let bestCross = null;
        let bestIntra = null;
        let highestCrossROI = -100;
        let highestIntraROI = -100;

        buys.forEach(b => {
            sells.forEach(s => {
                let roi = ((s.price - b.price) / b.price) * 100;
                let isSame = this.isSameExchange({ buyExchange: b.exchange, sellExchange: s.exchange });
                if (isSame) {
                    if (roi > highestIntraROI) {
                        highestIntraROI = roi;
                        bestIntra = { buy: b, sell: s, roi: roi };
                    }
                } else {
                    if (roi > highestCrossROI) {
                        highestCrossROI = roi;
                        bestCross = { buy: b, sell: s, roi: roi };
                    }
                }
            });
        });

        item.arbitrageDetails = item.arbitrageDetails || {};

        let crossTrigger = (this.settings.crossMinROI !== undefined) ? this.settings.crossMinROI : 0.5;
        let intraTrigger = (this.settings.intraMinROI !== undefined) ? this.settings.intraMinROI : 0;

        // Fix Bug 1: Expire stale depth cache entries
        const DEPTH_TTL = 10000;
        const now = Date.now();
        if (this.depthCache[coin]) {
            for (const ex of Object.keys(this.depthCache[coin])) {
                const ts = this.depthTimestamps[`${coin}_${ex}`];
                if (!ts || (now - ts > DEPTH_TTL)) {
                    delete this.depthCache[coin][ex];
                }
            }
            if (Object.keys(this.depthCache[coin]).length === 0) {
                delete this.depthCache[coin];
            }
        }

        const processOpportunity = (opportunity, triggerLevel, type) => {
            if (!opportunity) return null;

            let isTriggered = opportunity.roi >= triggerLevel;
            let waitingForDepth = false;

            if (isTriggered) {
                const triggerDepth = (exchange) => {
                    this.fetchDepth(coin, exchange);
                    if (!this.depthCache[coin]?.[exchange]) {
                        waitingForDepth = true;
                    }
                };

                triggerDepth(opportunity.buy.exchange);
                if (opportunity.sell.exchange !== opportunity.buy.exchange) {
                    triggerDepth(opportunity.sell.exchange);
                }
            }

            if (waitingForDepth) return null;

            let finalTradeStats = {
                tradeAmountTRY: 0,
                profit: 0,
                avgBuyPrice: opportunity.buy.price,
                avgSellPrice: opportunity.sell.price,
                totalVolume: 0
            };

            const getDepth = (type, exchange) => {
                if (exchange.includes('Binance')) {
                    if (this.depthCache[coin]?.[exchange]?.[type]) return this.depthCache[coin][exchange][type];
                    if (this.depthCache[coin]?.['Binance']?.[type]) return this.depthCache[coin]['Binance'][type];
                }
                if (exchange.includes('BTCTurk')) {
                    if (this.depthCache[coin]?.[exchange]?.[type]) return this.depthCache[coin][exchange][type];
                    if (this.depthCache[coin]?.['BTCTurk']?.[type]) return this.depthCache[coin]['BTCTurk'][type];
                }
                if (exchange.includes('Paribu')) {
                    if (this.depthCache[coin]?.[exchange]?.[type]) return this.depthCache[coin][exchange][type];
                    if (this.depthCache[coin]?.['Paribu']?.[type]) return this.depthCache[coin]['Paribu'][type];
                }
                return null;
            };

            let depthError = false;
            if (this.depthCache[coin]?.[opportunity.buy.exchange]?.error ||
                this.depthCache[coin]?.[opportunity.sell.exchange]?.error) {
                depthError = true;
            }

            if (!depthError) {
                let asks = getDepth('asks', opportunity.buy.exchange);
                let bids = getDepth('bids', opportunity.sell.exchange);

                const normalizeOrderBook = (book, exchange, tType) => {
                    if (!book) return null;
                    let isUSDT = exchange.includes('USDT');

                    if (isUSDT) {
                        let rateObj = null;
                        if (exchange.includes('Binance')) rateObj = this.binanceUSDT;
                        else if (exchange.includes('BTCTurk')) rateObj = this.btcturkUSDT;
                        else if (exchange.includes('Paribu')) rateObj = this.paribuUSDT;

                        if (!rateObj || !rateObj.price) return null;

                        let rate = tType === 'asks' ? (rateObj.ask || rateObj.price) : (rateObj.bid || rateObj.price);
                        if (!rate || rate === 0) rate = 30;

                        return book.map(level => [
                            parseFloat(level[0]) * rate,
                            parseFloat(level[1])
                        ]);
                    }
                    return book;
                };

                asks = normalizeOrderBook(asks, opportunity.buy.exchange, 'asks');
                bids = normalizeOrderBook(bids, opportunity.sell.exchange, 'bids');

                if (!asks && opportunity.buy.qty) {
                    asks = [[opportunity.buy.price, opportunity.buy.qty]];
                }
                if (!bids && opportunity.sell.qty) {
                    bids = [[opportunity.sell.price, opportunity.sell.qty]];
                }

                if (asks && bids && asks.length > 0 && bids.length > 0) {
                    finalTradeStats = this.calculateOrderBookMatch(asks, bids, Infinity);
                    if (finalTradeStats.totalVolume > 0) {
                        opportunity.roi = finalTradeStats.effectiveROI;
                    }
                }
            }

            return {
                buyExchange: opportunity.buy.exchange,
                sellExchange: opportunity.sell.exchange,
                buyPrice: finalTradeStats.avgBuyPrice || opportunity.buy.price,
                sellPrice: finalTradeStats.avgSellPrice || opportunity.sell.price,
                buyPriceRaw: opportunity.buy.rawPrice,
                sellPriceRaw: opportunity.sell.rawPrice,
                effectiveBuyPriceTRY: opportunity.buy.price,
                effectiveSellPriceTRY: opportunity.sell.price,
                tradeAmountTRY: finalTradeStats.tradeAmountTRY,
                profit: finalTradeStats.profit,
                roi: opportunity.roi,
                buyQty: opportunity.buy.qty,
                sellQty: opportunity.sell.qty,
                depthFetched: (this.depthCache[coin] && this.depthCache[coin][opportunity.buy.exchange]) ? true : false
            };
        };

        let processedCross = processOpportunity(bestCross, crossTrigger, 'cross');
        let processedIntra = processOpportunity(bestIntra, intraTrigger, 'intra');

        if (!bestCross && !bestIntra && this.depthCache[coin]) {
            delete this.depthCache[coin];
        }

        if (processedCross) item.arbitrageDetails.cross = processedCross;
        if (processedIntra) item.arbitrageDetails.intra = processedIntra;

        if (processedCross && processedIntra) item.ROI = Math.max(processedCross.roi, processedIntra.roi);
        else if (processedCross) item.ROI = processedCross.roi;
        else if (processedIntra) item.ROI = processedIntra.roi;
        else item.ROI = Math.max(highestCrossROI, highestIntraROI);

        if (!item.arbitrageDetails.cross && !item.arbitrageDetails.intra) {
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
        let sameExchangeOpportunities = [];
        let crossExchangeOpportunities = [];
        let paribuOpportunities = [];

        Object.keys(this.coinList).forEach(key => {
            const details = this.coinList[key].arbitrageDetails;
            if (!details) return;

            if (details.cross) {
                const isParibu = details.cross.buyExchange.includes('Paribu') || details.cross.sellExchange.includes('Paribu');
                if (isParibu) {
                    paribuOpportunities.push({ coin: key, ...details.cross, isSameExchange: false });
                } else {
                    crossExchangeOpportunities.push({ coin: key, ...details.cross });
                }
            }
            if (details.intra) {
                const isParibu = details.intra.buyExchange.includes('Paribu');
                if (isParibu) {
                    paribuOpportunities.push({ coin: key, ...details.intra, isSameExchange: true });
                } else {
                    sameExchangeOpportunities.push({ coin: key, ...details.intra });
                }
            }
        });

        // --- SAME-EXCHANGE: Apply ROI and Min Profit filters ---
        if (this.settings.intraEnabled !== false) {
            const intraMinROI = (this.settings.intraMinROI !== undefined) ? this.settings.intraMinROI : 0;
            const intraMinProfit = (this.settings.intraMinProfit !== undefined) ? this.settings.intraMinProfit : 100;

            const sameExchangeFiltered = sameExchangeOpportunities.filter(o =>
                o.roi >= intraMinROI &&
                o.profit >= intraMinProfit &&
                this.getBaseExchange(o.buyExchange) !== 'Binance'
            );

            sameExchangeFiltered.sort((a, b) => b.profit - a.profit);
            sameExchangeFiltered.forEach((op) => {
                this.checkAndSendTelegramAlert(op, true);
            });
        }

        // --- CROSS-EXCHANGE: Apply ROI and Min Profit filters ---
        if (this.settings.crossEnabled !== false) {
            const crossMinROI = (this.settings.crossMinROI !== undefined) ? this.settings.crossMinROI : 0.50;
            const crossMinProfit = (this.settings.crossMinProfit !== undefined) ? this.settings.crossMinProfit : 1000;

            const filteredCross = crossExchangeOpportunities.filter(o =>
                o.roi >= crossMinROI &&
                o.profit >= crossMinProfit
            );

            filteredCross.sort((a, b) => b.profit - a.profit);
            const top3 = filteredCross.slice(0, 3);

            top3.forEach((op) => {
                this.checkAndSendTelegramAlert(op, false);
            });
        }

        // --- PARIBU DEALS: Apply ROI and Min Profit filters ---
        if (this.settings.paribuEnabled !== false) {
            const paribuMinROI = (this.settings.paribuMinROI !== undefined) ? this.settings.paribuMinROI : 0;
            const paribuMinProfit = (this.settings.paribuMinProfit !== undefined) ? this.settings.paribuMinProfit : 50;

            const filteredParibu = paribuOpportunities.filter(o =>
                o.roi >= paribuMinROI &&
                o.profit >= paribuMinProfit
            );

            filteredParibu.sort((a, b) => b.profit - a.profit);
            const paribuTop3 = filteredParibu.slice(0, 3);

            paribuTop3.forEach((op) => {
                this.checkAndSendTelegramAlert(op, op.isSameExchange);
            });
        }
    }

    async checkAndSendTelegramAlert(op, isSameExchange = false) {
        if (this.settings.blockedCoins && this.settings.blockedCoins.includes(op.coin.toLowerCase())) {
            return; // Exit earlier if coin is blocked
        }

        let now = Date.now();

        // Use global cooldown from settings
        const configCooldown = (this.settings.globalCooldown !== undefined) ? this.settings.globalCooldown : 5;
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
        const fmt0 = (n) => formatParts(n, 0);

        // Smart decimal formatting: use appropriate precision based on price magnitude
        const fmtPrice = (n) => {
            if (n === 0) return '0';
            const abs = Math.abs(n);
            if (abs >= 1000) return formatParts(n, 2);     // ₺1,234.56
            if (abs >= 1) return formatParts(n, 4);     // ₺23.6361
            if (abs >= 0.01) return formatParts(n, 6);     // $0.006713
            return formatParts(n, 8);                       // $0.00007123
        };

        // Removing Sanity Check entirely as requested.

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
            `🛒 <b>Buy:</b> ${op.buyExchange}  (@ ${buyCurrency}${fmtPrice(buyDisplay)})\n` +
            `🤝 <b>Sell:</b> ${op.sellExchange} (@ ${sellCurrency}${fmtPrice(sellDisplay)})\n` +
            `📊 <b>Trade Capacity:</b> ₺${fmt0(op.tradeAmountTRY)}`;

        try {
            await TelegramService.broadcast(msg);
        } catch (e) {
            console.error('Telegram alert failed:', e.message);
        }
    }
}

module.exports = new CoinDataService();
