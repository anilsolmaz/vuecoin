const f = require('./js/functions');
const config = require('./configs/config.json');

let intervalId = null;
let isPolling = false;
let workerRequestCount = 0;

function startPolling() {
    if (isPolling) return;
    isPolling = true;
    console.log('👷 Background Worker STARTED');

    // Initial Run immediately
    runCycle();

    intervalId = setInterval(runCycle, 1000); // 1.0s interval
}

async function runCycle() {
    workerRequestCount++;
    try {
        await Promise.all([
            f.updateParibuData(workerRequestCount, true).catch(e => null),
            f.updateBinanceData(workerRequestCount, true).catch(e => null),
            f.updateBTCTurkData(workerRequestCount, true).catch(e => null)
        ]);
        // console.log('Worker Cycle Complete');
    } catch (e) {
        console.error('Worker Cycle Error', e);
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
        // If last request was less than 10 seconds ago, BE ACTIVE
        if (now - lastRequestTime < 10000) {
            startPolling();
        } else {
            stopPolling();
        }
    }
};
