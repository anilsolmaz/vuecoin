/**
 * Background Worker
 * Polls exchange data every 1 second and emits updates via Socket.IO.
 * Runs 24/7 regardless of connected clients.
 */
const CoinDataService = require('./services/CoinDataService');

let io = null;
let isProcessing = false;
let cycleCount = 0;

function start() {
    console.log('👷 Background Worker STARTED (24/7 mode)');

    // Initial run immediately
    runCycle();

    // Then every 1 second
    setInterval(runCycle, 1000);
}

async function runCycle() {
    if (isProcessing) return; // Prevent overlapping cycles
    isProcessing = true;
    cycleCount++;

    try {
        const aggregatedData = await CoinDataService.refreshAllData();

        // Print a single heartbeat every 60 cycles (approx 1 min)
        if (cycleCount % 60 === 0) {
            const coinCount = Object.keys(aggregatedData || {}).length;
            const clientCount = (io && io.engine) ? io.engine.clientsCount : 0;
            console.log(`[${new Date().toLocaleTimeString('tr-TR')}] 💓 Worker Cycle #${cycleCount} OK | Monitored Coins: ${coinCount} | Web Clients: ${clientCount}`);
        }

        // Emit to connected clients if any
        if (io && io.engine && io.engine.clientsCount > 0) {
            io.emit('data_update', aggregatedData);
        }
    } catch (e) {
        console.error('Worker Cycle Error', e);
    } finally {
        isProcessing = false;
    }
}

module.exports = {
    start,
    setSocket: function (ioInstance) {
        io = ioInstance;
    }
};
