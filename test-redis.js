const redis = require("redis");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

const client = redis.createClient({
    "port": process.env.REDIS_PORT,
    "password": process.env.REDIS_PASSWORD,
    "host": process.env.REDIS_HOST
});

const key = 'arb_settings';
const val = JSON.stringify({ cooldown: 7, minProfit: 1200, minROI: 0.8 });

client.on('error', (err) => console.error('Redis Error:', err));

console.log('Testing Redis connection...');
client.set(key, val, (err) => {
    if (err) {
        console.error('SET failed:', err);
        process.exit(1);
    }
    console.log('SET successful');
    client.get(key, (err, reply) => {
        if (err) {
            console.error('GET failed:', err);
            process.exit(1);
        }
        console.log('GET successful, reply:', reply);
        process.exit(0);
    });
});
