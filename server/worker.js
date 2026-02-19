/**
 * Background Worker
 * Polls exchange data every 1 second and emits updates via Socket.IO.
 * Runs 24/7 regardless of connected clients.
 */
const CoinDataService = require('./services/CoinDataService');

let io = null;
let isProcessing = false;

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

    try {
        const aggregatedData = await CoinDataService.refreshAllData();

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
