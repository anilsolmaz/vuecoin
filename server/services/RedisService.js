const redis = require("redis");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// In-Memory Fallback Cache (handles TTL and basic Redis commands if Redis is offline)
const memCache = new Map();
const memLists = new Map();

function memSetEx(key, ttlSeconds, value, cb) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    memCache.set(key, { value: String(value), expiresAt });
    if (cb) cb(null, 'OK');
}

function memSet(key, value, cb) {
    memCache.set(key, { value: String(value), expiresAt: null });
    if (cb) cb(null, 'OK');
}

function memGet(key, cb) {
    const item = memCache.get(key);
    if (!item) return cb(null, null);
    if (item.expiresAt && Date.now() > item.expiresAt) {
        memCache.delete(key);
        return cb(null, null);
    }
    return cb(null, item.value);
}

function memLrange(key, start, stop, cb) {
    const list = memLists.get(key) || [];
    const end = stop === -1 ? list.length : stop + 1;
    cb(null, list.slice(start, end));
}

function memLpush(key, value, cb) {
    let list = memLists.get(key) || [];
    list.unshift(value);
    memLists.set(key, list);
    if (cb) cb(null, list.length);
}

function memLrem(key, count, value, cb) {
    let list = memLists.get(key) || [];
    const initialLen = list.length;
    list = list.filter(item => item !== value);
    memLists.set(key, list);
    if (cb) cb(null, initialLen - list.length);
}

function memDel(key, cb) {
    const deleted = memCache.delete(key) ? 1 : (memLists.delete(key) ? 1 : 0);
    if (cb) cb(null, deleted);
}

let client;

if (process.env.NODE_ENV !== 'test' && process.env.REDIS_HOST) {
    let isConnected = false;

    const rawClient = redis.createClient({
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        host: process.env.REDIS_HOST,
        connect_timeout: 3000,
        enable_offline_queue: false,
        retry_strategy: (options) => {
            if (options.error && options.error.code === 'ENOTFOUND') {
                return undefined;
            }
            if (options.total_retry_time > 1000 * 5) {
                return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
        }
    });

    rawClient.on('error', (err) => {
        isConnected = false;
    });

    rawClient.on('connect', () => {
        isConnected = true;
    });

    client = {
        on: (event, handler) => rawClient.on(event, handler),
        set: (k, v, cb) => {
            if (isConnected) {
                try { rawClient.set(k, v, (err, res) => err ? memSet(k, v, cb) : cb && cb(null, res)); }
                catch (e) { memSet(k, v, cb); }
            } else {
                memSet(k, v, cb);
            }
        },
        setex: (k, t, v, cb) => {
            if (isConnected) {
                try { rawClient.setex(k, t, v, (err, res) => err ? memSetEx(k, t, v, cb) : cb && cb(null, res)); }
                catch (e) { memSetEx(k, t, v, cb); }
            } else {
                memSetEx(k, t, v, cb);
            }
        },
        get: (k, cb) => {
            if (isConnected) {
                try { rawClient.get(k, (err, data) => err ? memGet(k, cb) : cb(null, data)); }
                catch (e) { memGet(k, cb); }
            } else {
                memGet(k, cb);
            }
        },
        del: (k, cb) => {
            if (isConnected) {
                try { rawClient.del(k, (err, res) => err ? memDel(k, cb) : cb && cb(null, res)); }
                catch (e) { memDel(k, cb); }
            } else {
                memDel(k, cb);
            }
        },
        lrange: (k, s, e, cb) => {
            if (isConnected) {
                try { rawClient.lrange(k, s, e, (err, data) => err ? memLrange(k, s, e, cb) : cb(null, data)); }
                catch (e) { memLrange(k, s, e, cb); }
            } else {
                memLrange(k, s, e, cb);
            }
        },
        lpush: (k, v, cb) => {
            if (isConnected) {
                try { rawClient.lpush(k, v, (err, res) => err ? memLpush(k, v, cb) : cb && cb(null, res)); }
                catch (e) { memLpush(k, v, cb); }
            } else {
                memLpush(k, v, cb);
            }
        },
        lrem: (k, c, v, cb) => {
            if (isConnected) {
                try { rawClient.lrem(k, c, v, (err, res) => err ? memLrem(k, c, v, cb) : cb && cb(null, res)); }
                catch (e) { memLrem(k, c, v, cb); }
            } else {
                memLrem(k, c, v, cb);
            }
        }
    };
} else {
    // Mock client for tests
    client = {
        on: () => { },
        set: (k, v, cb) => cb && cb(null),
        setex: (k, t, v, cb) => cb && cb(null),
        get: (k, cb) => cb(null, null),
        del: (k, cb) => cb && cb(null, 1),
        lrange: (k, s, e, cb) => cb(null, []),
        lpush: (k, v, cb) => cb && cb(null),
        lrem: (k, c, v, cb) => cb && cb(null, 0)
    };
}

module.exports = client;

