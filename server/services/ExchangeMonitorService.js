const TelegramService = require('./TelegramService');

class ExchangeMonitorService {
    constructor() {
        this.statuses = {
            paribu: 'UP',
            binance: 'UP',
            btcturk: 'UP'
        };
        this.lastErrorMessages = {
            paribu: '',
            binance: '',
            btcturk: ''
        };
    }

    async reportSuccess(exchange) {
        if (this.statuses[exchange] === 'DOWN') {
            this.statuses[exchange] = 'UP';
            const message = `🟢 <b>API RECOVERED: ${exchange.toUpperCase()}</b>\n\n✅ Connection established. Bot is resumed fetching data from this exchange.`;
            await TelegramService.broadcast(message);
        }
    }

    async reportFailure(exchange, error) {
        const errorMsg = error.message || 'Unknown Error';

        // Extract useful info from status codes if possible
        let details = errorMsg;
        if (error.response && error.response.status === 429) {
            details = 'Rate Limited (HTTP 429)';
        } else if (error.code === 'ECONNABORTED') {
            details = 'Request Timeout';
        }

        if (this.statuses[exchange] === 'UP') {
            this.statuses[exchange] = 'DOWN';
            this.lastErrorMessages[exchange] = details;

            const message = `🔴 <b>API DOWN: ${exchange.toUpperCase()}</b>\n\n` +
                `❌ <b>Error:</b> ${details}\n` +
                `⚠️ Bot will pause processing this exchange until it's back up.`;

            await TelegramService.broadcast(message);
        }
    }
}

module.exports = new ExchangeMonitorService();
