/**
 * Benchmark Binance Vision (Public data API / WS)
 */
const axios = require('axios');
const WebSocket = require('ws');

const REST_URL = 'https://data-api.binance.vision/api/v3/ticker/bookTicker?symbol=BTCUSDT';
const WS_URL = 'wss://data-stream.binance.vision/ws/btcusdt@bookTicker';

console.log('🏁 Starting Binance Vision REST vs WebSocket Benchmark...');

let restSamples = [];
let wsSamples = [];
let wsMessageCount = 0;
let restCount = 0;

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('✅ WebSocket Connected to data-stream.binance.vision');
});

ws.on('message', (data) => {
    const recvTime = Date.now();
    wsMessageCount++;
    try {
        const parsed = JSON.parse(data);
        const eventTime = parsed.E || parsed.T;
        if (eventTime) {
            wsSamples.push(recvTime - eventTime);
        }
    } catch (e) {}
});

ws.on('error', (err) => console.error('WS Error:', err.message));

const restInterval = setInterval(async () => {
    restCount++;
    const sendTime = Date.now();
    try {
        const res = await axios.get(REST_URL, { timeout: 3000 });
        const recvTime = Date.now();
        restSamples.push(recvTime - sendTime);
    } catch (e) {
        console.error('REST Error:', e.message);
    }
}, 1000);

setTimeout(() => {
    clearInterval(restInterval);
    ws.close();

    console.log('\n════════════════════ BENCHMARK RESULTS ════════════════════');
    console.log(`⏱️ Duration: 8 seconds`);
    
    const avgRestRtt = restSamples.length ? (restSamples.reduce((a, b) => a + b, 0) / restSamples.length).toFixed(1) : 0;
    const minRestRtt = restSamples.length ? Math.min(...restSamples) : 0;
    const maxRestRtt = restSamples.length ? Math.max(...restSamples) : 0;
    console.log(`\n📊 REST API (data-api.binance.vision):`);
    console.log(`   - Total Requests: ${restCount}`);
    console.log(`   - Successful: ${restSamples.length}`);
    console.log(`   - RTT: avg=${avgRestRtt}ms | min=${minRestRtt}ms | max=${maxRestRtt}ms`);

    const avgWsLag = wsSamples.length ? (wsSamples.reduce((a, b) => a + b, 0) / wsSamples.length).toFixed(1) : 0;
    const minWsLag = wsSamples.length ? Math.min(...wsSamples) : 0;
    const maxWsLag = wsSamples.length ? Math.max(...wsSamples) : 0;
    console.log(`\n⚡ WebSocket Stream (data-stream.binance.vision):`);
    console.log(`   - Total Updates Pushed: ${wsMessageCount} updates (~${(wsMessageCount / 8).toFixed(1)} updates/sec)`);
    console.log(`   - Event-to-Client Lag: avg=${avgWsLag}ms | min=${minWsLag}ms | max=${maxWsLag}ms`);

    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
}, 8500);
