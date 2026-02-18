const f = require('./js/functions');
const config = require('./configs/config.json');
const CoinDataService = require('./services/CoinDataService');

let intervalId = null;
let isPolling = false;
let workerRequestCount = 0;
let io = null;

function startPolling() {
    if (isPolling) return;
    isPolling = true;
    console.log('👷 Background Worker STARTED');

    // Initial Run immediately
    runCycle();

    intervalId = setInterval(runCycle, 1000); // 1.0s interval
}

let isProcessing = false;

async function runCycle() {
    if (isProcessing) return; // Prevent overlapping cycles
    isProcessing = true;

    workerRequestCount++;
    try {
        await Promise.all([
            f.updateParibuData(workerRequestCount, true).catch(e => null),
            f.updateBinanceData(workerRequestCount, true).catch(e => null),
            f.updateBTCTurkData(workerRequestCount, true).catch(e => null)
        ]);
        if (io) {
            const aggregatedData = await CoinDataService.refreshAllData();
            io.emit('data_update', aggregatedData);
        }
    } catch (e) {
        console.error('Worker Cycle Error', e);
    } finally {
        isProcessing = false;
    }
}

function stopPolling() {
    if (!isPolling) return;
    isPolling = false;
    clearInterval(intervalId);
    console.log('💤 Background Worker SLEEPING (No active users)');
}

module.exports = {
    checkActivity: function (lastRequestTime) {
        let now = Date.now();
        let hasActiveSockets = false;

        if (io && io.engine) {
            hasActiveSockets = io.engine.clientsCount > 0;
        }

        // If last request was less than 10 seconds ago OR there are active sockets, BE ACTIVE
        if ((now - lastRequestTime < 10000) || hasActiveSockets) {
            startPolling();
        } else {
            stopPolling();
        }
    },
    setSocket: function (ioInstance) {
        io = ioInstance;
    }
};
