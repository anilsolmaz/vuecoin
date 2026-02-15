require('dotenv').config({ path: __dirname + '/server/.env' });
const express = require('express');
const apiRouter = require('./server/routes');
const worker = require('./server/worker');

const app = express();

let lastRequestTime = Date.now();

// Watchdog: Check activity every 2 seconds
setInterval(() => {
    worker.checkActivity(lastRequestTime);
}, 2000);

app.use(express.json());
app.use(function (req, res, next) {
    lastRequestTime = Date.now(); // Update activity
    worker.checkActivity(lastRequestTime); // Wake up worker if sleeping

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use('/api', apiRouter);

const PORT = process.env.PORT || '3000';
app.listen(PORT, () => {
    console.log(`Server şu portta çalışıyor: ${PORT}`);
});


