"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settlePredictions = exports.placePrediction = void 0;
const supabase_1 = require("../../lib/supabase");
const logger_1 = require("../../utils/logger");
const redis_1 = require("../../lib/redis");
const service_1 = require("../../wallet/service");
const nse_1 = require("../../utils/nse");
const placePrediction = async (userId, market, direction, amount, mode, windowMinutes) => {
    // Check market price
    const cachedPriceStr = await redis_1.redis.get(`market:${market}`);
    if (!cachedPriceStr) {
        throw new Error('Market price currently unavailable');
    }
    const entryPrice = parseFloat(String(cachedPriceStr));
    // Debit funds
    const debitRes = await (0, service_1.debit)(userId, amount, mode, `Prediction on ${market}`);
    if (!debitRes.success) {
        throw new Error(debitRes.error || 'Failed to process bet');
    }
    const closeDate = new Date();
    closeDate.setMinutes(closeDate.getMinutes() + windowMinutes);
    const { data, error } = await supabase_1.supabase.from('predictions').insert([
        {
            user_id: userId,
            market: market,
            direction: direction.toLowerCase(),
            entry_price: entryPrice,
            amount: amount,
            mode: mode,
            status: 'pending',
            window_close_at: closeDate.toISOString()
        }
    ]).select('*').single();
    if (error || !data) {
        logger_1.logger.error(error, 'Prediction insertion failed');
        await (0, service_1.credit)(userId, amount, mode, `Refund: Prediction on ${market} failed`);
        throw new Error('Database error saving prediction');
    }
    return { success: true, prediction: data, newBalance: debitRes.newBalance };
};
exports.placePrediction = placePrediction;
const settlePredictions = async () => {
    logger_1.logger.info('Running prediction settlement job...');
    const now = new Date().toISOString();
    const { data: pending, error } = await supabase_1.supabase
        .from('predictions')
        .select('*')
        .eq('status', 'pending')
        .lte('window_close_at', now);
    if (error || !pending || pending.length === 0) {
        return;
    }
    // Group by market for batching (though NSE is per stock)
    const markets = new Set();
    pending.forEach((p) => markets.add(p.market));
    const closePrices = new Map();
    for (const m of Array.from(markets)) {
        if ((0, nse_1.isNseSymbol)(m)) {
            // NSE Stock – Fetch via scraper
            const price = await (0, nse_1.fetchNsePrice)(m);
            if (price)
                closePrices.set(m, price);
        }
        else {
            // Real-time market (Crypto/FX) – Fetch via Redis
            const pStr = await redis_1.redis.get(`market:${m}`);
            if (pStr)
                closePrices.set(m, parseFloat(String(pStr)));
        }
    }
    for (const prediction of pending) {
        const { id, user_id, market, direction, entry_price, amount, mode } = prediction;
        const closePrice = closePrices.get(market);
        if (closePrice === undefined) {
            logger_1.logger.warn(`No closing price found for ${market}. Skipping settlement for prediction ${id}.`);
            continue; // Wait until next tick to try again
        }
        const won = (direction === 'up' && closePrice > entry_price) ||
            (direction === 'down' && closePrice < entry_price);
        if (won) {
            const winAmount = Number((amount * 1.9).toFixed(2)); // 1.9x payout = 5% house edge
            await (0, service_1.credit)(user_id, winAmount, mode, `Prediction Won on ${market}`);
        }
        await supabase_1.supabase.from('predictions').update({ status: 'settled', close_price: closePrice }).eq('id', id);
    }
    logger_1.logger.info(`Settled ${pending.length} predictions`);
};
exports.settlePredictions = settlePredictions;
