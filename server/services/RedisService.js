const redis = require("redis");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let client;

if (process.env.NODE_ENV !== 'test') {
    client = redis.createClient({
        "port": process.env.REDIS_PORT,
        "password": process.env.REDIS_PASSWORD,
        "host": process.env.REDIS_HOST
    });

    client.on('error', (err) => {
        // Silent error for production, or use a proper logger
    });

    client.on('connect', () => {
        // Connected
    });
} else {
    // Mock client for tests
    client = {
        on: () => { },
        set: (k, v, cb) => cb(null),
        get: (k, cb) => cb(null, null),
        lrange: (k, s, e, cb) => cb(null, []),
        lpush: (k, v, cb) => cb(null)
    };
}

module.exports = client;
