const CoinDataService = require('../services/CoinDataService');
const f = require('../js/functions');

exports.getAllParibuData = async (req, res, next) => {
    try {
        // console.log('DataController: Requesting Data Update');
        const data = await CoinDataService.refreshAllData();
        res.status(200).json(data);
    } catch (e) {
        console.error('DataController Error', e);
        next(e);
    }
};

exports.updateParibuMarkets = async (req, res, next) => {
    try {
        // f.increaseValueByOne();
        res.status(200).json('Başarıyla update edildi');
    } catch (e) {
        next(e);
    }
};
