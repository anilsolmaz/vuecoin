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

const CoinDataService = require('./server/services/CoinDataService');
const ListingMonitorService = require('./server/services/ListingMonitorService');

// Initialize Listing Monitor
if (process.env.NODE_ENV !== 'test') {
    ListingMonitorService.init().then(() => {
        // Run check every 1 second for real-time listing detection
        setInterval(() => {
            ListingMonitorService.checkParibuListings();
        }, 1000);
    });
}

// Setup Socket.IO and start worker (24/7)
worker.setSocket(io);

io.on('connection', (socket) => {
    // Send available data immediately upon connection
    if (CoinDataService.coinList && Object.keys(CoinDataService.coinList).length > 0) {
        socket.emit('data_update', CoinDataService.coinList);
    }
});

// Start the worker — runs 24/7 regardless of connected clients
if (process.env.NODE_ENV !== 'test') {
    worker.start();
}

app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, 'client/dist')));

app.use('/api', apiRouter);

// Forward all other requests to the Vue app (for SPA routing)
app.get('*', (req, res) => {
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
