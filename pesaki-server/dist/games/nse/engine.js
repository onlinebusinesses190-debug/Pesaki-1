"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeNsePrediction = exports.getNextNseClose = void 0;
const supabase_1 = require("../../lib/supabase");
const logger_1 = require("../../utils/logger");
const service_1 = require("../../wallet/service");
/**
 * Calculates the next NSE market close (15:00 EAT)
 * NSE is open Mon-Fri, 09:00 - 15:00 EAT.
 */
const getNextNseClose = () => {
    const now = new Date();
    // Get EAT time (UTC+3)
    const eatTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const close = new Date(eatTime);
    close.setUTCHours(12, 0, 0, 0); // 12:00 UTC is 15:00 EAT
    // If it's already past 15:00 EAT or it's a weekend, move to next weekday
    if (eatTime.getUTCHours() >= 15 || eatTime.getUTCDay() === 0 || eatTime.getUTCDay() === 6) {
        close.setUTCDate(close.getUTCDate() + 1);
        while (close.getUTCDay() === 0 || close.getUTCDay() === 6) {
            close.setUTCDate(close.getUTCDate() + 1);
        }
    }
    // Convert back to UTC for the database
    return new Date(close.getTime() - 3 * 60 * 60 * 1000);
};
exports.getNextNseClose = getNextNseClose;
const placeNsePrediction = async (userId, symbol, direction, amount, mode, entryPrice) => {
    // 1. Debit wallet
    const debitRes = await (0, service_1.debit)(userId, amount, mode, `NSE Predict: ${symbol} ${direction}`);
    if (!debitRes.success) {
        throw new Error(debitRes.error || 'Insufficient funds');
    }
    // 2. Set settlement time to next market close
    const windowCloseAt = (0, exports.getNextNseClose)();
    // 3. Save prediction
    const { data, error } = await supabase_1.supabase.from('predictions').insert([
        {
            user_id: userId,
            market: symbol,
            direction: direction.toLowerCase(),
            entry_price: entryPrice,
            amount: amount,
            mode: mode,
            status: 'pending',
            window_close_at: windowCloseAt.toISOString()
        }
    ]).select('*').single();
    if (error || !data) {
        logger_1.logger.error(error, `NSE prediction failed for ${symbol}`);
        // Optional: Refund if DB fails
        throw new Error('Failed to record prediction');
    }
    return { success: true, prediction: data, newBalance: debitRes.newBalance };
};
exports.placeNsePrediction = placeNsePrediction;
