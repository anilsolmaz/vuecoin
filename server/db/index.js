const request = require('request');
const { DateTime } = require("luxon");

let bisudb = {}

bisudb.getParibuData = (coinPair, ip) => {
    return new Promise((resolve, reject) => {
        request(`http://${ip}:3000/api/singlecoin/${coinPair}`, {timeout:1500},function (error, response, body) {
            if (!response) {
                return reject({
                    status : false,
                    statusCode : 500,
                    message : `Geçersiz URL (Paribu) ${coinPair}`
                })
            } else if(response.statusCode==200) {
                return resolve(JSON.parse(response.body))
            } else {
                return reject(JSON.parse(response.body))
            }
        })
    })
}

bisudb.singleCoin = (coinPair) => {
    return new Promise((resolve, reject) => {
        request.get(`https://web.paribu.com/market/${coinPair}/orderbook`, {timeout: 1500}, function(err, res, body) {

            if (!res) {
                return reject({
                    status : false,
                    statusCode : 500,
                    message : `Geçersiz URL (Paribu) ${coinPair}`
                })
            } else if(res.statusCode==200) {
                return resolve({
                    status : true,
                    statusCode : res.statusCode,
                    data: JSON.parse(body).payload
                })
            } else if(res.statusCode==422) {
                return reject({
                    status : false,
                    statusCode : res.statusCode,
                    message : JSON.parse(res.body).message
                })
            } else if(res.statusCode==429) {
                return reject({
                    status : false,
                    statusCode : res.statusCode,
                    message : `İstek Aşımı ${coinPair}`
                })
            } else {
                return reject({
                    status : false,
                    statusCode : res.statusCode,
                    message : `Bilinmeyen hata ${coinPair}`
                })
            }
        })
    })
}

bisudb.getBinanceData = (coinList) => {
    return new Promise((resolve, reject) => {
        request.get('https://api.binance.com/api/v3/ticker/price', {timeout: 1500},function (err, res, body) {
            if(!res) {
                return reject({
                    status : false,
                    statusCode : 500,
                    message : "Geçersiz URL (500 hatası - binance)"
                })
            } else  if (res.statusCode == 200) {
                let binanceData = JSON.parse(body)

                let filteredData = {}
                binanceData.map( (coin1) => {
                    coinList.map( (coin2) => {
                        if (coin1.symbol == coin2) {
                            if (coin2.split('USDT')[0].toLowerCase() == '') {
                                filteredData['usdt'] = coin1.price
                            } else {
                                filteredData[coin2.split('USDT')[0].toLowerCase()] = coin1.price
                            }
                        }
                    })
                })

                return resolve({
                    status : true,
                    market : 'binance',
                    lastUpdateTimeString: DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
                    data : filteredData
                });
            } else {
                return reject({
                    status : false,
                    statusCode : res.statusCode,
                    message : "bilinmeyen hata"
                })
            }
        })
    })
}

bisudb.getParibuInitials = () => {
    return new Promise((resolve, reject) => {
        request('https://v3.paribu.com/app/initials', {timeout:1500},function (error, response, body) {
            if (!response) {
                return reject(error)
            } else if(response.statusCode==200) {
                return resolve(JSON.parse(response.body).data)
            } else {
                return reject(JSON.parse(response.body))
            }
        })
    })
}

module.exports = bisudb;
