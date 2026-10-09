const axios = require('axios');
const { DateTime } = require('luxon');
const RedisService = require('./RedisService');
const TelegramService = require('./TelegramService');

class PortfolioReportService {
    constructor() {
        this.profileName = 'jito';
        this.targetTimezone = 'America/Los_Angeles'; // UTC-7 (Pacific Time)
        this.targetHour = 21; // 21:00 (9 PM)
        this.targetMinute = 0;
        this.timer = null;
        this.lastSentDate = null;
        this.priceHistoryCache = {}; // { [coin]: { current, d1, d7, d30, fetchedAt } }
    }

    /**
     * Start the daily report scheduler
     */
    start() {
        console.log(`[PortfolioReportService] 🚀 Daily Report Service started (Target: ${this.targetHour}:00 ${this.targetTimezone})`);
        
        // Check every 30 seconds
        this.timer = setInterval(() => {
            this.checkSchedule();
        }, 30000);

        // Immediate initial check
        this.checkSchedule();
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Check if it is 21:00 Pacific Time and send if not sent today
     */
    async checkSchedule() {
        const now = DateTime.now().setZone(this.targetTimezone);
        const todayDate = now.toISODate(); // YYYY-MM-DD

        // Trigger condition: hour == 21, minute == 0, and haven't sent today
        if (now.hour === this.targetHour && now.minute === this.targetMinute) {
            if (this.lastSentDate !== todayDate) {
                this.lastSentDate = todayDate;
                console.log(`[PortfolioReportService] ⏰ 21:00 Pacific reached on ${todayDate}. Generating report...`);
                try {
                    await this.generateAndSendReport();
                } catch (e) {
                    console.error('[PortfolioReportService] Error generating daily report:', e.message);
                }
            }
        }
    }

    /**
     * Fetch portfolio items for profile 'jito'
     */
    async getPortfolioItems() {
        return new Promise((resolve) => {
            const key = `portfolio_${this.profileName}`;
            RedisService.get(key, (err, data) => {
                if (!err && data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            return resolve(parsed);
                        }
                    } catch (e) {
                        console.error('[PortfolioReportService] JSON parse error for portfolio:', e.message);
                    }
                }
                resolve([]);
            });
        });
    }

    /**
     * Get live USDT/TRY exchange rate
     */
    getUsdtTryRate() {
        try {
            const CoinDataService = require('./CoinDataService');
            if (CoinDataService.coinList && CoinDataService.coinList['usdt']) {
                const u = CoinDataService.coinList['usdt'];
                if (u.paribu?.try?.price) return u.paribu.try.price;
                if (u.binance?.try?.price) return u.binance.try.price;
            }
        } catch (e) {}
        return 36.5; // fallback
    }

    /**
     * Fetch current price for a coin
     */
    async getCurrentPrice(coin) {
        if (!coin) return 0;
        const c = coin.toLowerCase().trim();
        if (c === 'usdt' || c === 'usdc') return 1.0;

        // 1. Try CoinDataService cache
        try {
            const CoinDataService = require('./CoinDataService');
            const d = CoinDataService.coinList?.[c];
            if (d) {
                if (d.binance?.usdt?.price > 0) return d.binance.usdt.price;
                if (d.paribu?.usdt?.price > 0) return d.paribu.usdt.price;
                if (d.paribu?.try?.price > 0) {
                    const rate = this.getUsdtTryRate();
                    return d.paribu.try.price / rate;
                }
            }
        } catch (e) {}

        // 2. Direct Binance Ticker Fallback
        try {
            const symbol = c.toUpperCase() + 'USDT';
            const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { timeout: 3000 });
            if (res.data?.price) {
                const p = parseFloat(res.data.price);
                if (!isNaN(p) && p > 0) return p;
            }
        } catch (e) {}

        return 0;
    }

    /**
     * Fetch historical prices (1d, 7d, 30d) for a coin
     * Uses Binance 1d klines with backfill
     */
    async getHistoricalPrices(coin, currentPrice) {
        const c = coin.toLowerCase().trim();
        if (c === 'usdt' || c === 'usdc') {
            return { current: 1.0, d1: 1.0, d7: 1.0, d30: 1.0 };
        }

        // Check local memory cache (valid for 1 hour)
        const cached = this.priceHistoryCache[c];
        if (cached && (Date.now() - cached.fetchedAt < 3600000)) {
            return { ...cached, current: currentPrice || cached.current };
        }

        let p1d = currentPrice;
        let p7d = currentPrice;
        let p30d = currentPrice;

        try {
            const symbol = c.toUpperCase() + 'USDT';
            // Fetch 35 daily candles from Binance
            const res = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=35`, { timeout: 4000 });
            if (Array.isArray(res.data) && res.data.length >= 2) {
                const len = res.data.length;
                // Index len - 2: Yesterday's close (1 day ago)
                p1d = parseFloat(res.data[len - 2][4]) || currentPrice;
                
                // Index len - 8: 7 days ago
                if (len >= 8) {
                    p7d = parseFloat(res.data[len - 8][4]) || p1d;
                } else {
                    p7d = parseFloat(res.data[0][4]) || p1d;
                }

                // Index len - 31 or index 0: 30 days ago
                if (len >= 31) {
                    p30d = parseFloat(res.data[len - 31][4]) || p7d;
                } else {
                    p30d = parseFloat(res.data[0][4]) || p7d;
                }
            }
        } catch (e) {
            // Binance failed or coin not on Binance, keep currentPrice as fallback
        }

        const result = {
            current: currentPrice,
            d1: p1d,
            d7: p7d,
            d30: p30d,
            fetchedAt: Date.now()
        };

        this.priceHistoryCache[c] = result;
        return result;
    }

    /**
     * Format currency numbers
     */
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Format percentage change with + or - sign
     */
    formatChange(pct, diffUsdt = null) {
        if (isNaN(pct)) pct = 0;
        const sign = pct > 0 ? '+' : (pct < 0 ? '' : '');
        const pctStr = `${sign}${pct.toFixed(2)}%`;
        if (diffUsdt !== null && !isNaN(diffUsdt)) {
            const dSign = diffUsdt > 0 ? '+$' : (diffUsdt < 0 ? '-$' : '$');
            const dStr = `${dSign}${this.formatNumber(Math.abs(diffUsdt), 2)}`;
            return `${pctStr} (${dStr})`;
        }
        return pctStr;
    }

    /**
     * Generate the complete portfolio report data
     */
    async generateReportData() {
        const items = await this.getPortfolioItems();
        if (!items || items.length === 0) {
            return null;
        }

        const usdtRate = this.getUsdtTryRate();
        const assetCalculations = [];

        for (const item of items) {
            const coin = item.coin.toLowerCase();
            const amount = parseFloat(item.amount) || 0;
            if (amount <= 0) continue;

            const currentPrice = await this.getCurrentPrice(coin);
            const history = await this.getHistoricalPrices(coin, currentPrice);

            const currentValue = amount * currentPrice;
            const value1d = amount * history.d1;
            const value7d = amount * history.d7;
            const value30d = amount * history.d30;

            const diff1d = currentValue - value1d;
            const pct1d = value1d > 0 ? ((diff1d / value1d) * 100) : 0;

            const diff7d = currentValue - value7d;
            const pct7d = value7d > 0 ? ((diff7d / value7d) * 100) : 0;

            const diff30d = currentValue - value30d;
            const pct30d = value30d > 0 ? ((diff30d / value30d) * 100) : 0;

            assetCalculations.push({
                coin: coin.toUpperCase(),
                amount,
                currentPrice,
                currentValue,
                price1d: history.d1,
                price7d: history.d7,
                price30d: history.d30,
                diff1d, pct1d,
                diff7d, pct7d,
                diff30d, pct30d
            });
        }

        // Sort descending by currentValue to identify Top 5 most valuable
        assetCalculations.sort((a, b) => b.currentValue - a.currentValue);

        // Calculate Totals across ALL assets in the portfolio
        const totalValueUsdt = assetCalculations.reduce((sum, a) => sum + a.currentValue, 0);
        const totalValueTry = totalValueUsdt * usdtRate;

        const totalValue1d = assetCalculations.reduce((sum, a) => sum + (a.amount * a.price1d), 0);
        const totalValue7d = assetCalculations.reduce((sum, a) => sum + (a.amount * a.price7d), 0);
        const totalValue30d = assetCalculations.reduce((sum, a) => sum + (a.amount * a.price30d), 0);

        const totalDiff1d = totalValueUsdt - totalValue1d;
        const totalPct1d = totalValue1d > 0 ? ((totalDiff1d / totalValue1d) * 100) : 0;

        const totalDiff7d = totalValueUsdt - totalValue7d;
        const totalPct7d = totalValue7d > 0 ? ((totalDiff7d / totalValue7d) * 100) : 0;

        const totalDiff30d = totalValueUsdt - totalValue30d;
        const totalPct30d = totalValue30d > 0 ? ((totalDiff30d / totalValue30d) * 100) : 0;

        const top5 = assetCalculations.slice(0, 5);

        return {
            datePacific: DateTime.now().setZone(this.targetTimezone).toFormat('dd.MM.yyyy | HH:mm'),
            totalValueUsdt,
            totalValueTry,
            totalDiff1d, totalPct1d,
            totalDiff7d, totalPct7d,
            totalDiff30d, totalPct30d,
            top5,
            totalAssetCount: assetCalculations.length
        };
    }

    /**
     * Build the Telegram HTML message
     */
    buildReportMessage(data) {
        if (!data) {
            return `⚠️ <b>Jito Portföy Raporu</b>\n\n<i>Portföyde kayıtlı varlık bulunamadı.</i>`;
        }

        const medalEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

        let msg = `📊 <b>Jito Portföy Günlük Raporu</b>\n` +
            `📅 <i>${data.datePacific} (UTC-7 Pasifik)</i>\n` +
            `───────────────────────\n` +
            `💰 <b>Toplam Portföy Değeri:</b>\n` +
            `💵 <b>$${this.formatNumber(data.totalValueUsdt, 2)}</b> (≈ ₺${this.formatNumber(data.totalValueTry, 0)})\n\n` +
            `📈 <b>Toplam Bakiye Değişimi:</b>\n` +
            `• <b>1 Günlük:</b> ${this.formatChange(data.totalPct1d, data.totalDiff1d)}\n` +
            `• <b>Haftalık (7G):</b> ${this.formatChange(data.totalPct7d, data.totalDiff7d)}\n` +
            `• <b>Aylık (30G):</b> ${this.formatChange(data.totalPct30d, data.totalDiff30d)}\n` +
            `───────────────────────\n` +
            `🏆 <b>En Değerli 5 Varlık:</b>\n\n`;

        data.top5.forEach((coin, idx) => {
            const medal = medalEmojis[idx] || `<b>${idx + 1}.</b>`;
            const amountFmt = coin.amount < 1 ? coin.amount.toFixed(4) : this.formatNumber(coin.amount, 2);
            const priceFmt = coin.currentPrice >= 1 ? `$${this.formatNumber(coin.currentPrice, 2)}` : `$${coin.currentPrice.toFixed(4)}`;

            msg += `${medal} <b>${coin.coin}</b> (${amountFmt} adet)\n` +
                `   💵 <b>Değer:</b> $${this.formatNumber(coin.currentValue, 2)} (@ ${priceFmt})\n` +
                `   • <b>1G:</b> ${this.formatChange(coin.pct1d, coin.diff1d)}\n` +
                `   • <b>7G:</b> ${this.formatChange(coin.pct7d, coin.diff7d)}\n` +
                `   • <b>30G:</b> ${this.formatChange(coin.pct30d, coin.diff30d)}\n\n`;
        });

        msg += `<i>Toplam ${data.totalAssetCount} farklı coin takip ediliyor.</i>`;
        return msg;
    }

    /**
     * Save snapshot of today's values to Redis
     */
    saveSnapshot(data) {
        if (!data) return;
        const todayStr = DateTime.now().setZone(this.targetTimezone).toISODate();
        const key = `portfolio_snapshot:${this.profileName}:${todayStr}`;
        const snapshot = {
            date: todayStr,
            timestamp: Date.now(),
            totalUsdt: data.totalValueUsdt,
            totalTry: data.totalValueTry,
            top5: data.top5.map(c => ({
                coin: c.coin,
                amount: c.amount,
                currentPrice: c.currentPrice,
                currentValue: c.currentValue
            }))
        };
        RedisService.set(key, JSON.stringify(snapshot), (err) => {
            if (err) console.error('[PortfolioReportService] Error saving snapshot:', err.message);
        });
    }

    /**
     * Generate report, broadcast to Telegram, and save daily snapshot
     */
    async generateAndSendReport() {
        const data = await this.generateReportData();
        const message = this.buildReportMessage(data);

        // Send to general Telegram channel/group
        await TelegramService.broadcast(message);

        // Save daily snapshot in Redis
        this.saveSnapshot(data);

        return { data, message };
    }
}

module.exports = new PortfolioReportService();
