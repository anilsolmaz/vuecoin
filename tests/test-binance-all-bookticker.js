const WebSocket = require('ws');

const coins = ['btc', 'eth', 'sol', 'bnb', 'xrp', 'doge', 'ada', 'avax', 'shib', 'dot', 'link', 'near', 'pepe', 'fet', 'trx'];
const streams = coins.map(c => `${c}usdt@bookTicker`);

const ws = new WebSocket('wss://data-stream.binance.vision/ws');

let updateCount = 0;
const seen = new Set();

ws.on('open', () => {
    console.log(`Subscribing to ${streams.length} streams...`);
    ws.send(JSON.stringify({
        method: "SUBSCRIBE",
        params: streams,
        id: 100
    }));
});

ws.on('message', (data) => {
    try {
        const item = JSON.parse(data);
        if (item.s) {
            updateCount++;
            seen.add(item.s);
        }
    } catch(e) {}
});

ws.on('error', (err) => console.error('Err:', err.message));

setTimeout(() => {
    ws.close();
    console.log(`Received ${updateCount} updates across ${seen.size} symbols in 4 seconds!`);
    console.log('Symbols updated:', Array.from(seen));
    process.exit(0);
}, 4500);
