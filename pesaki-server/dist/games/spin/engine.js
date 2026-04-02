"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playRound = exports.getPrizes = void 0;
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../../lib/supabase");
const service_1 = require("../../wallet/service");
const logger_1 = require("../../utils/logger");
const redis_1 = require("../../lib/redis");
const PRIZES_CACHE_KEY = 'spin:prizes';
const PRIZES_CACHE_TTL = 300; // 5 minutes in seconds
const getPrizes = async () => {
    // Try cache first
    const cached = await redis_1.redis.get(PRIZES_CACHE_KEY);
    if (cached) {
        logger_1.logger.info('Spin prizes loaded from Redis cache');
        return (typeof cached === 'string' ? JSON.parse(cached) : cached);
    }
    // Fall back to DB, ordered consistently so index always matches
    const { data: prizes, error } = await supabase_1.supabase
        .from('spin_prizes')
        .select('*')
        .order('id', { ascending: true });
    if (error || !prizes || prizes.length === 0) {
        throw new Error('No prizes configured');
    }
    // Cache for 5 minutes
    await redis_1.redis.set(PRIZES_CACHE_KEY, JSON.stringify(prizes), { ex: PRIZES_CACHE_TTL });
    logger_1.logger.info({ count: prizes.length }, 'Spin prizes fetched from DB and cached');
    return prizes;
};
exports.getPrizes = getPrizes;
const playRound = async (userId, betAmount, mode) => {
    if (betAmount <= 0)
        throw new Error('Bet amount must be positive');
    // Deduct from wallet first (fail fast before any RNG)
    const debitRes = await (0, service_1.debit)(userId, betAmount, mode, 'Spin Wheel Bet');
    if (!debitRes.success) {
        throw new Error(debitRes.error || 'Failed to process bet');
    }
    // Fetch prizes (cached)
    const prizes = await (0, exports.getPrizes)();
    // Weighted random selection
    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
    const randomValue = crypto_1.default.randomInt(0, totalWeight);
    let currentWeight = 0;
    let wonPrize = prizes[0];
    let prizeIndex = 0;
    for (let i = 0; i < prizes.length; i++) {
        const p = prizes[i];
        currentWeight += p.weight;
        if (randomValue < currentWeight) {
            wonPrize = p;
            prizeIndex = i;
            break;
        }
    }
    // Payout: prize.value is a multiplier of the stake
    // e.g. 0 = loss, 0.5 = half back, 1.0 = break even, 2.0 = double, 10.0 = jackpot
    const winAmount = Number((betAmount * wonPrize.value).toFixed(2));
    // Log result to DB (non-blocking failure; don't block user on insert errors)
    const { error: insertErr } = await supabase_1.supabase.from('spin_results').insert([
        {
            user_id: userId,
            bet_amount: betAmount,
            prize_id: wonPrize.id,
            prize_value: winAmount,
            mode
        }
    ]);
    if (insertErr) {
        logger_1.logger.error(insertErr, 'Failed to log spin result');
    }
    // Credit winnings if any
    let finalBalance = debitRes.newBalance;
    if (winAmount > 0) {
        const creditRes = await (0, service_1.credit)(userId, winAmount, mode, `Spin Win - ${wonPrize.name} (${wonPrize.value}x)`);
        if (creditRes.success) {
            finalBalance = creditRes.newBalance;
        }
    }
    return {
        prizeIndex,
        prizeName: wonPrize.name,
        prizeMultiplier: wonPrize.value,
        winAmount,
        prizes, // Return full list so frontend wheel is always in sync with DB
        newBalance: finalBalance,
    };
};
exports.playRound = playRound;
