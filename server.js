require('dotenv').config({ path: __dirname + '/server/.env' });
const express = require('express');
const apiRouter = require('./server/routes');
const worker = require('./server/worker');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const cors = require('cors');

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for dev
        methods: ["GET", "POST"]
    }
});
app.set('io', io);

const CoinDataService = require('./server/services/CoinDataService');
const ListingMonitorService = require('./server/services/ListingMonitorService');
const BinanceWebSocketService = require('./server/services/BinanceWebSocketService');
const ExchangePrecisionService = require('./server/services/ExchangePrecisionService');

// Initialize Real-time Services (Binance WebSocket, Listing Monitors & Precision Service)
if (process.env.NODE_ENV !== 'test') {
    BinanceWebSocketService.start();
    ExchangePrecisionService.start(); // Hourly precision updates

    ListingMonitorService.init().then(() => {
        // Run Paribu check every 1 second
        setInterval(() => {
            ListingMonitorService.checkParibuListings();
        }, 1000);
        // Run BTCTurk check every 5 seconds
        setInterval(() => {
            ListingMonitorService.checkBTCTurkListings();
        }, 5000);
    });
}

// Setup Socket.IO and start worker (24/7)
worker.setSocket(io);

io.on('connection', (socket) => {
    // Send available data immediately upon connection
    if (CoinDataService.coinList && Object.keys(CoinDataService.coinList).length > 0) {
        socket.emit('data_update', CoinDataService.coinList);
    }
    // Send available settings immediately upon connection
    if (CoinDataService.settings) {
        socket.emit('settings_update', CoinDataService.settings);
    }
});

// Start the worker — runs 24/7 regardless of connected clients
if (process.env.NODE_ENV !== 'test') {
    worker.start();
}

app.disable('x-powered-by');

// Basic Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.use(cors());
app.use(express.json({ limit: '200kb' }));

const path = require('path');
const staticOptions = {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
};
app.use(express.static(path.join(__dirname, 'client/dist'), staticOptions));
app.use('/vuecoin', express.static(path.join(__dirname, 'client/dist'), staticOptions));

app.use('/api', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('API Error:', err.message);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: 'Internal server error' });
});

// Forward all other requests to the Vue app (for SPA routing)
app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = process.env.PORT || '3000';
server.listen(PORT, () => {
    console.log(`Server şu portta çalışıyor: ${PORT}`);
    // Send startup notification
    if (process.env.NODE_ENV !== 'test') {
        const TelegramService = require('./server/services/TelegramService');
        TelegramService.broadcast('🚀 Server Started and Running!');
    }
});
