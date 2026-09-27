const RedisService = require('./RedisService');

class MuteService {
    constructor() {
        this.mutedCoins = {}; // { [coin]: { until: number, mutedAt: number, duration: string } }
        this.recentAlerts = []; // ['H', 'GLMR', 'FIL', 'TRX', 'ZIL'] (max 5)
        this.isInitialized = false;
    }

    /**
     * Initialize MuteService by loading state from Redis / in-memory cache
     */
    async init() {
        return new Promise((resolve) => {
            // Load muted coins from Redis
            RedisService.get('arb_muted_coins', (err, data) => {
                if (!err && data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed && typeof parsed === 'object') {
                            this.mutedCoins = parsed;
                            this.pruneExpired();
                        }
                    } catch (e) {
                        console.error('[MuteService] Error parsing arb_muted_coins:', e.message);
                    }
                }

                // Load recent alerts from Redis
                RedisService.get('arb_recent_alerts', (err2, data2) => {
                    if (!err2 && data2) {
                        try {
                            const parsed2 = JSON.parse(data2);
                            if (Array.isArray(parsed2)) {
                                this.recentAlerts = parsed2.slice(0, 5);
                            }
                        } catch (e) {
                            console.error('[MuteService] Error parsing arb_recent_alerts:', e.message);
                        }
                    }
                    this.isInitialized = true;
                    resolve(true);
                });
            });
        });
    }

    /**
     * Parse duration string to milliseconds
     * Supports: '1d', '3d', '7d', '1', '3', '7', '12h', '1h'
     */
    parseDuration(durationStr) {
        if (!durationStr) return 24 * 60 * 60 * 1000; // default 1 day

        const str = String(durationStr).trim().toLowerCase();
        if (str === '3d' || str === '3') return 3 * 24 * 60 * 60 * 1000;
        if (str === '7d' || str === '7') return 7 * 24 * 60 * 60 * 1000;
        if (str === '1d' || str === '1') return 24 * 60 * 60 * 1000;

        // Custom hours / days (e.g. '12h', '4d')
        if (str.endsWith('h')) {
            const h = parseInt(str.replace('h', ''));
            if (!isNaN(h) && h > 0) return h * 60 * 60 * 1000;
        }
        if (str.endsWith('d')) {
            const d = parseInt(str.replace('d', ''));
            if (!isNaN(d) && d > 0) return d * 24 * 60 * 60 * 1000;
        }

        const num = parseFloat(str);
        if (!isNaN(num) && num > 0) return num * 24 * 60 * 60 * 1000;

        return 24 * 60 * 60 * 1000; // default 1 day
    }

    /**
     * Mute a coin for a given duration
     */
    muteCoin(coin, durationStr = '1d') {
        if (!coin) return null;
        const cleanCoin = String(coin).toLowerCase().trim();
        const durationMs = this.parseDuration(durationStr);
        const now = Date.now();
        const until = now + durationMs;

        const muteInfo = {
            coin: cleanCoin,
            symbol: cleanCoin.toUpperCase(),
            until: until,
            mutedAt: now,
            duration: String(durationStr)
        };

        this.mutedCoins[cleanCoin] = muteInfo;
        this.saveMutedCoins();

        console.log(`[MuteService] 🔇 Muted coin: ${cleanCoin.toUpperCase()} until ${new Date(until).toISOString()}`);
        return muteInfo;
    }

    /**
     * Unmute a coin immediately
     */
    unmuteCoin(coin) {
        if (!coin) return false;
        const cleanCoin = String(coin).toLowerCase().trim();
        if (this.mutedCoins[cleanCoin]) {
            delete this.mutedCoins[cleanCoin];
            this.saveMutedCoins();
            console.log(`[MuteService] 🔊 Unmuted coin: ${cleanCoin.toUpperCase()}`);
            return true;
        }
        return false;
    }

    /**
     * Check if a coin is currently muted
     */
    isMuted(coin) {
        if (!coin) return false;
        const cleanCoin = String(coin).toLowerCase().trim();
        const item = this.mutedCoins[cleanCoin];
        if (!item) return false;

        // Auto prune if expired
        if (Date.now() >= item.until) {
            delete this.mutedCoins[cleanCoin];
            this.saveMutedCoins();
            return false;
        }

        return true;
    }

    /**
     * Remove expired mutes
     */
    pruneExpired() {
        const now = Date.now();
        let changed = false;
        Object.keys(this.mutedCoins).forEach(coin => {
            if (this.mutedCoins[coin].until && now >= this.mutedCoins[coin].until) {
                delete this.mutedCoins[coin];
                changed = true;
            }
        });
        if (changed) {
            this.saveMutedCoins();
        }
    }

    /**
     * Get all active muted coins with formatted remaining time
     */
    getMutedCoins() {
        this.pruneExpired();
        const now = Date.now();
        return Object.values(this.mutedCoins).map(item => {
            const remainingMs = Math.max(0, item.until - now);
            return {
                ...item,
                remainingMs,
                remainingText: this.formatRemaining(remainingMs),
                untilFormatted: this.formatDate(item.until)
            };
        }).sort((a, b) => a.until - b.until);
    }

    /**
     * Record a coin that received an alert
     * Keeps up to 5 most recent unique coins
     */
    addRecentAlert(coin) {
        if (!coin) return;
        const cleanCoin = String(coin).toUpperCase().trim();
        // Remove existing occurrence to place it at the front
        this.recentAlerts = this.recentAlerts.filter(c => c !== cleanCoin);
        this.recentAlerts.unshift(cleanCoin);
        // Keep max 5
        this.recentAlerts = this.recentAlerts.slice(0, 5);
        this.saveRecentAlerts();
    }

    /**
     * Get the last 5 alerted coins for suggestions
     */
    getRecentAlerts() {
        return [...this.recentAlerts];
    }

    /**
     * Format remaining milliseconds to human readable Turkish text
     */
    formatRemaining(ms) {
        if (ms <= 0) return 'Süresi doldu';
        const totalMinutes = Math.floor(ms / (60 * 1000));
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        const minutes = totalMinutes % 60;

        if (days > 0) {
            return `${days} gün ${hours} saat`;
        }
        if (hours > 0) {
            return `${hours} saat ${minutes} dk`;
        }
        return `${Math.max(1, minutes)} dakika`;
    }

    /**
     * Format timestamp to local date string (e.g. "28.09.2026 21:30")
     */
    formatDate(timestamp) {
        const d = new Date(timestamp);
        const pad = (n) => String(n).padStart(2, '0');
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    saveMutedCoins() {
        RedisService.set('arb_muted_coins', JSON.stringify(this.mutedCoins), (err) => {
            if (err) console.error('[MuteService] Error saving arb_muted_coins:', err.message);
        });
    }

    saveRecentAlerts() {
        RedisService.set('arb_recent_alerts', JSON.stringify(this.recentAlerts), (err) => {
            if (err) console.error('[MuteService] Error saving arb_recent_alerts:', err.message);
        });
    }
}

module.exports = new MuteService();
