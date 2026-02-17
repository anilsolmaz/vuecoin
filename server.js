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

worker.setSocket(io);

io.on('connection', (socket) => {
    console.log('User connected', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
    });
});

app.use(cors());

let lastRequestTime = Date.now();

// Watchdog: Check activity every 2 seconds
setInterval(() => {
    worker.checkActivity(lastRequestTime);
}, 2000);

app.use(express.json());
app.use(function (req, res, next) {
    lastRequestTime = Date.now(); // Update activity
    worker.checkActivity(lastRequestTime); // Wake up worker if sleeping
    next();
});
app.use('/api', apiRouter);

const PORT = process.env.PORT || '3000';
server.listen(PORT, () => {
    console.log(`Server şu portta çalışıyor: ${PORT}`);
});


