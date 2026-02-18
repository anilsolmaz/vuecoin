const TelegramService = require('./server/services/TelegramService');

async function testAlertFormat() {
    const op = {
        coin: 'fakecoin',
        profit: 1500.55,
        roi: 2.5,
        buyExchange: 'Binance',
        sellExchange: 'Paribu',
        tradeAmountTRY: 50000
    };

    let msg = `🔥 *HIGH PROFIT ARBITRAGE DETECTED!*\n\n` +
        `🪙 *Coin:* ${op.coin.toUpperCase()}\n` +
        `💰 *Potential Gain:* ₺${op.profit.toFixed(2)}\n` +
        `📈 *ROI:* %${op.roi.toFixed(2)}\n` +
        `🛒 *Buy:* ${op.buyExchange}\n` +
        `🤝 *Sell:* ${op.sellExchange}\n` +
        `📊 *Trade Capacity:* ₺${op.tradeAmountTRY.toFixed(0)}\n\n` +
        `🚀 _Budget: Unlimited (Market Capacity Based)_`;

    console.log('Sending formatted test alert...');
    await TelegramService.broadcast(msg);
}

testAlertFormat();
