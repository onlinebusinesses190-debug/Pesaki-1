"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNewRound = exports.cashOut = exports.placeBet = exports.getAviatorState = void 0;
const hash_1 = require("../../utils/hash");
const rng_1 = require("./rng");
const logger_1 = require("../../utils/logger");
const index_1 = require("../../socket/index");
const crypto_1 = require("crypto");
const service_1 = require("../../wallet/service");
let currentRound = null;
let activeBets = new Map();
let currentMultiplier = 1.0;
let flightInterval = null;
const TICK_RATE = 100; // 100ms
const WAITING_TIME = 5000; // 5s wait between rounds
const getAviatorState = () => ({
    round: currentRound,
    multiplier: currentMultiplier,
    activeBets: Array.from(activeBets.entries()),
});
exports.getAviatorState = getAviatorState;
const placeBet = (userId, amount, mode) => {
    if (currentRound?.status !== 'WAITING') {
        throw new Error('Round is already in progress');
    }
    if (activeBets.has(userId)) {
        throw new Error('You already placed a bet this round');
    }
    const bet = { userId, amount, mode, cashedOut: false };
    activeBets.set(userId, bet);
    return bet;
};
exports.placeBet = placeBet;
const cashOut = async (userId) => {
    if (currentRound?.status !== 'FLYING') {
        throw new Error('Can only cash out while flying');
    }
    const bet = activeBets.get(userId);
    if (!bet || bet.cashedOut) {
        throw new Error('No active bet found or already cashed out');
    }
    // Calculate winnings based on CURRENT multiplier to avoid spoofing
    const cashoutMultiplier = currentMultiplier;
    const winAmount = Number((bet.amount * cashoutMultiplier).toFixed(2));
    bet.cashedOut = true;
    bet.cashoutMultiplier = cashoutMultiplier;
    bet.cashoutAmount = winAmount;
    // Credit user wallet
    const result = await (0, service_1.credit)(userId, winAmount, bet.mode, `Aviator Win (x${cashoutMultiplier})`);
    if (!result.success) {
        logger_1.logger.error({ userId, winAmount }, 'Failed to credit player cashout!');
    }
    return { multiplier: cashoutMultiplier, winAmount, newBalance: result.newBalance };
};
exports.cashOut = cashOut;
const tickFlight = () => {
    if (!currentRound || currentRound.status !== 'FLYING')
        return;
    const elapsedTime = Date.now() - currentRound.startTime;
    // Multiplier formula: grows exponentially over time. 
    // Formula: multiplier = e^(0.06 * timeInSeconds)
    currentMultiplier = Math.pow(Math.E, 0.06 * (elapsedTime / 1000));
    if (currentMultiplier >= currentRound.crashPoint) {
        crashRound();
    }
    else {
        index_1.io.of('/aviator').emit('MULTIPLIER_TICK', { multiplier: currentMultiplier.toFixed(2) });
    }
};
const startFlying = () => {
    if (!currentRound)
        return;
    currentRound.status = 'FLYING';
    currentRound.startTime = Date.now();
    currentMultiplier = 1.0;
    index_1.io.of('/aviator').emit('ROUND_START', {
        roundId: currentRound.id,
        hash: currentRound.hash
    });
    flightInterval = setInterval(tickFlight, TICK_RATE);
};
const crashRound = () => {
    if (flightInterval)
        clearInterval(flightInterval);
    if (!currentRound)
        return;
    currentRound.status = 'CRASHED';
    index_1.io.of('/aviator').emit('ROUND_CRASHED', {
        multiplier: currentRound.crashPoint,
        serverSeed: currentRound.serverSeed, // Reveal server seed for verification
    });
    // Clean up lost bets here (e.g. logging to database if necessary)
    const losers = Array.from(activeBets.values()).filter(b => !b.cashedOut);
    logger_1.logger.info({ crashedAt: currentRound.crashPoint, losers: losers.length }, 'Round crashed');
    setTimeout(exports.startNewRound, WAITING_TIME);
};
const startNewRound = () => {
    const { serverSeed, clientSeed, crashPoint } = (0, rng_1.generateRoundOutcome)();
    currentRound = {
        id: (0, crypto_1.randomUUID)(),
        serverSeed,
        clientSeed,
        hash: (0, hash_1.sha256)(serverSeed),
        crashPoint,
        startTime: 0,
        status: 'WAITING',
    };
    currentMultiplier = 1.0;
    activeBets.clear();
    index_1.io.of('/aviator').emit('ROUND_WAITING', {
        roundId: currentRound.id,
        hash: currentRound.hash,
        waitTime: WAITING_TIME
    });
    logger_1.logger.info({ roundId: currentRound.id, crashPoint: currentRound.crashPoint }, 'New Aviator round waiting');
    setTimeout(startFlying, WAITING_TIME);
};
exports.startNewRound = startNewRound;
