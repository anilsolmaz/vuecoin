/**
 * Binance WebSocket Service
 * Provides real-time, sub-millisecond bookTicker updates using Binance WebSocket stream.
 * Automatically handles reconnection, dynamic subscriptions, and fallback to REST when needed.
 */
const WebSocket = require('ws');
const ExchangeMonitorService = require('./ExchangeMonitorService');

class BinanceWebSocketService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.subscribedStreams = new Set();
        this.cache = {}; // symbol -> { price, bid, bidQty, ask, askQty }
        this.lastMessageTime = 0;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.wsUrl = 'wss://data-stream.binance.vision/ws';
        this.backupWsUrl = 'wss://stream.binance.com:9443/ws';
        this.currentUrl = this.wsUrl;
        this.excludedSymbols = new Set([
            'HNTUSDT', 'GALUSDT', 'REEFUSDT', 'BEAMUSDT', 'BALUSDT', 'OMGUSDT',
            'RNDRUSDT', 'WAVESUSDT', 'CLVUSDT', 'RDNTUSDT', 'FTMUSDT', 'MATICUSDT',
            'EOSUSDT', 'MKRUSDT'
        ]);
    }

    start() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            this.ws = new WebSocket(this.currentUrl);

            this.ws.on('open', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                ExchangeMonitorService.reportSuccess('binance');
                console.log(`⚡ [Binance WS] Connected to ${this.currentUrl}`);

                // Re-subscribe to all active streams if reconnecting
                if (this.subscribedStreams.size > 0) {
                    this.sendSubscription(Array.from(this.subscribedStreams));
                }
            });

            this.ws.on('message', (data) => {
                this.lastMessageTime = Date.now();
                try {
                    const parsed = JSON.parse(data);
                    // Single stream bookTicker payload: { u, s: symbol, b: bid, B: bidQty, a: ask, A: askQty }
                    if (parsed && parsed.s) {
                        const symbol = parsed.s.toUpperCase();
                        if (!this.excludedSymbols.has(symbol)) {
                            const bid = parseFloat(parsed.b) || 0;
                            const ask = parseFloat(parsed.a) || 0;
                            this.cache[symbol] = {
                                price: (bid + ask) / 2,
                                bid: bid,
                                bidQty: parseFloat(parsed.B) || 0,
                                ask: ask,
                                askQty: parseFloat(parsed.A) || 0
                            };
                        }
                    }
                } catch (e) {
                    // Ignore malformed message
                }
            });

            this.ws.on('error', (err) => {
                console.error(`[Binance WS] Error:`, err.message);
            });

            this.ws.on('close', (code, reason) => {
                this.isConnected = false;
                console.log(`[Binance WS] Closed (code: ${code}, reason: ${reason ? reason.toString() : 'none'})`);
                this.scheduleReconnect();
            });

        } catch (e) {
            console.error('[Binance WS] Failed to initialize WebSocket:', e.message);
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectAttempts++;
        const delay = Math.min(1500 * Math.pow(1.5, this.reconnectAttempts), 15000);
        console.log(`[Binance WS] Reconnecting in ${(delay / 1000).toFixed(1)}s (Attempt #${this.reconnectAttempts})...`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.start();
        }, delay);
    }

    /**
     * Subscribe to one or multiple symbols (e.g. ['BTC', 'ETH'] or ['BTCUSDT', 'USDTTRY'])
     */
    subscribeSymbols(coins) {
        if (!Array.isArray(coins)) coins = [coins];
        const newStreams = [];

        coins.forEach(c => {
            if (!c) return;
            let clean = String(c).toLowerCase().trim();
            // Format streams
            const streamsToAdd = [];
            if (!clean.endsWith('usdt') && !clean.endsWith('try')) {
                streamsToAdd.push(`${clean}usdt@bookTicker`);
                streamsToAdd.push(`${clean}try@bookTicker`);
            } else {
                streamsToAdd.push(`${clean}@bookTicker`);
            }

            streamsToAdd.forEach(stream => {
                if (!this.subscribedStreams.has(stream)) {
                    this.subscribedStreams.add(stream);
                    newStreams.push(stream);
                }
            });
        });

        if (newStreams.length > 0 && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            this.sendSubscription(newStreams);
        }
    }

    sendSubscription(streamList) {
        // Binance limits subscriptions to 1024 streams per connection and 5 messages per second
        const CHUNK_SIZE = 300;
        let delay = 0;
        for (let i = 0; i < streamList.length; i += CHUNK_SIZE) {
            const chunk = streamList.slice(i, i + CHUNK_SIZE);
            const subMsg = {
                method: "SUBSCRIBE",
                params: chunk,
                id: Date.now() + i
            };
            setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    try {
                        this.ws.send(JSON.stringify(subMsg));
                    } catch (e) {
                        console.error('[Binance WS] Error sending subscription chunk:', e.message);
                    }
                }
            }, delay);
            delay += 300;
        }
    }

    /**
     * Check if WebSocket stream is healthy (connected & message received within 5 seconds)
     */
    isLive() {
        return this.isConnected && (Date.now() - this.lastMessageTime < 5000) && Object.keys(this.cache).length > 5;
    }

    /**
     * Returns all cached Binance data in identical JSON schema to fetchBinance()
     */
    getBinanceJSON() {
        return {
            market: "binance",
            ...this.cache
        };
    }
}

// Export singleton instance
module.exports = new BinanceWebSocketService();
