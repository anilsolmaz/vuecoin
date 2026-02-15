require('dotenv').config({ path: __dirname + '/server/.env' });
const express       = require('express');
const apiRouter     = require('./server/routes');
const app = express();

app.use(express.json());
app.use(function(req, res, next) {
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


