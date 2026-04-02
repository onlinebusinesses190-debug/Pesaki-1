"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playRound = void 0;
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../../lib/supabase");
const service_1 = require("../../wallet/service");
const logger_1 = require("../../utils/logger");
const playRound = async (userId, betAmount, mode) => {
    if (betAmount <= 0)
        throw new Error('Bet amount must be positive');
    // Deduct from wallet first
    const debitRes = await (0, service_1.debit)(userId, betAmount, mode, 'Spin Wheel Bet');
    if (!debitRes.success) {
        throw new Error(debitRes.error || 'Failed to process bet');
    }
    // Fetch prizes to calculate wheels
    const { data: prizes, error } = await supabase_1.supabase.from('spin_prizes').select('*');
    if (error || !prizes || prizes.length === 0) {
        throw new Error('No prizes configured');
    }
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
    // Insert result into DB
    const { error: insertErr } = await supabase_1.supabase.from('spin_results').insert([
        {
            user_id: userId,
            bet_amount: betAmount,
            prize_id: wonPrize.id,
            prize_value: wonPrize.value,
            mode
        }
    ]);
    if (insertErr) {
        logger_1.logger.error(insertErr, 'Failed to log spin result');
    }
    // Credit winnings
    let finalBalance = debitRes.newBalance;
    if (wonPrize.value > 0) {
        const creditRes = await (0, service_1.credit)(userId, wonPrize.value, mode, `Spin Win - ${wonPrize.name}`);
        if (creditRes.success) {
            finalBalance = creditRes.newBalance;
        }
    }
    return {
        prizeIndex,
        prizeValue: wonPrize.value,
        newBalance: finalBalance
    };
};
exports.playRound = playRound;
