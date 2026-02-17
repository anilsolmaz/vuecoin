const fs = require('fs');
const path = './server/configs/config.json';
const config = require(path);

function deduplicate(arr) {
    return [...new Set(arr)].sort();
}

if (config.exchangeMarkets.paribu.markets) {
    config.exchangeMarkets.paribu.markets = deduplicate(config.exchangeMarkets.paribu.markets);
}
if (config.exchangeMarkets.BTCTurk.markets) {
    config.exchangeMarkets.BTCTurk.markets = deduplicate(config.exchangeMarkets.BTCTurk.markets);
}
// Check where else duplicates might be. The user paste showed them in paribu markets mainly.

fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('Config deduplicated!');
