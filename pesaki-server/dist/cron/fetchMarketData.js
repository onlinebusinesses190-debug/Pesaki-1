"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMarketData = void 0;
const axios_1 = __importDefault(require("axios"));
const redis_1 = require("../lib/redis");
const logger_1 = require("../utils/logger");
const fetchMarketData = async () => {
    logger_1.logger.info('Fetching live market data...');
    try {
        // 1. Fetch Forex Rates (Free Frankfurter API)
        const fxResponse = await axios_1.default.get('https://api.frankfurter.app/latest?to=KES');
        if (fxResponse.data && fxResponse.data.rates && fxResponse.data.rates.KES) {
            const gbpResponse = await axios_1.default.get('https://api.frankfurter.app/latest?from=GBP&to=KES');
            const eurResponse = await axios_1.default.get('https://api.frankfurter.app/latest?from=EUR&to=KES');
            const usdKes = fxResponse.data.rates.KES;
            const gbpKes = gbpResponse.data.rates.KES;
            const eurKes = eurResponse.data.rates.KES;
            // TTL of 6 minutes (360s) so it outlives the 5-minute fetch slightly
            await redis_1.redis.set('market:USD/KES', usdKes, 'EX', 360);
            await redis_1.redis.set('market:GBP/KES', gbpKes, 'EX', 360);
            await redis_1.redis.set('market:EUR/KES', eurKes, 'EX', 360);
            logger_1.logger.info(`Forex Updated: USD/KES=${usdKes}, GBP/KES=${gbpKes}, EUR/KES=${eurKes}`);
        }
        // 2. Fetch NSE Data 
        // Usually retrieved via an internal proxy or public feed, mocking for structure here
        const nseSafaricomStr = await redis_1.redis.get('mock:NSE/SCOM');
        const baseScom = nseSafaricomStr ? parseFloat(nseSafaricomStr) : 15.00;
        const newScom = baseScom + (Math.random() * 0.4 - 0.2); // random walk
        await redis_1.redis.set('market:NSE/SCOM', newScom.toFixed(2), 'EX', 360);
        logger_1.logger.info(`NSE Updated: NSE/SCOM=${newScom.toFixed(2)}`);
    }
    catch (err) {
        logger_1.logger.error(err, 'Error fetching live market data');
    }
};
exports.fetchMarketData = fetchMarketData;
