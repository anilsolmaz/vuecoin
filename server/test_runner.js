const CoinDataService = require('./services/CoinDataService');

async function test() {
    try {
        console.log("Starting service test...");
        
        console.log("Running initialize...");
        await CoinDataService.initialize();
        console.log("Initialized!");

        const data = await CoinDataService.refreshAllData();
        console.log("Data returned successfully. Keys:", Object.keys(data).length);
        
        if (data.btc) {
            console.log("BTC Data:", data.btc);
        } else {
            console.log("No BTC data found in result.");
        }
    } catch(e) {
        console.error("Crash during test:", e);
    }
    process.exit(0);
}

test();
