const axios = require('axios');
const { DateTime } = require("luxon");

let bisudb = {}

bisudb.getParibuData = async (coinPair, ip) => {
    try {
        const response = await axios.get(`http://${ip}:3000/api/singlecoin/${coinPair}`, { timeout: 1500 });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw error.response.data; // Forward error from server
        } else if (error.request) {
            throw {
                status: false,
                statusCode: 500,
                message: `Geçersiz URL (Paribu) ${coinPair}`
            };
        } else {
            throw {
                status: false,
                statusCode: 500,
                message: error.message
            };
        }
    }
}

bisudb.singleCoin = async (coinPair) => {
    try {
        const response = await axios.get(`https://web.paribu.com/market/${coinPair}/orderbook`, { timeout: 1500 });
        return {
            status: true,
            statusCode: response.status,
            data: response.data.payload
        };
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            if (status === 422) {
                throw {
                    status: false,
                    statusCode: status,
                    message: error.response.data.message
                };
            } else if (status === 429) {
                throw {
                    status: false,
                    statusCode: status,
                    message: `İstek Aşımı ${coinPair}`
                };
            } else {
                throw {
                    status: false,
                    statusCode: status,
                    message: `Bilinmeyen hata ${coinPair}`
                };
            }
        } else {
            throw {
                status: false,
                statusCode: 500,
                message: `Geçersiz URL (Paribu) ${coinPair}`
            };
        }
    }
}

bisudb.getBinanceData = async (coinList) => {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price', { timeout: 1500 });
        let binanceData = response.data;

        let filteredData = {}
        binanceData.map((coin1) => {
            coinList.map((coin2) => {
                if (coin1.symbol == coin2) {
                    if (coin2.split('USDT')[0].toLowerCase() == '') {
                        filteredData['usdt'] = coin1.price
                    } else {
                        filteredData[coin2.split('USDT')[0].toLowerCase()] = coin1.price
                    }
                }
            })
        })

        return {
            status: true,
            market: 'binance',
            lastUpdateTimeString: DateTime.local().setZone("Turkey").setLocale('tr').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
            data: filteredData
        };

    } catch (error) {
        if (error.response) {
            throw {
                status: false,
                statusCode: error.response.status,
                message: "bilinmeyen hata"
            };
        } else {
            throw {
                status: false,
                statusCode: 500,
                message: "Geçersiz URL (500 hatası - binance)"
            };
        }
    }
}

bisudb.getParibuInitials = async () => {
    try {
        const response = await axios.get('https://v3.paribu.com/app/initials', { timeout: 1500 });
        return response.data.data;
    } catch (error) {
        if (error.response) {
            throw error.response.data;
        } else {
            throw error;
        }
    }
}

module.exports = bisudb;
