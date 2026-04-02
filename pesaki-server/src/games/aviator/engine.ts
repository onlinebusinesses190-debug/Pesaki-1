import { sha256 } from '../../utils/hash';
import { generateRoundOutcome } from './rng';
import { logger } from '../../utils/logger';
import { io } from '../../socket/index';
import { randomUUID } from 'crypto';
import { AviatorRound, AviatorBet } from './types';
import { credit, debit } from '../../wallet/service';

let currentRound: AviatorRound | null = null;
let activeBets: Map<string, AviatorBet> = new Map();
let currentMultiplier = 1.0;
let flightInterval: NodeJS.Timeout | null = null;
const TICK_RATE = 100; // 100ms
const WAITING_TIME = 5000; // 5s wait between rounds

export const getAviatorState = () => ({
  round: currentRound,
  multiplier: currentMultiplier,
  activeBets: Array.from(activeBets.entries()),
});

export const placeBet = async (userId: string, amount: number, mode: 'real' | 'demo') => {
  if (currentRound?.status !== 'WAITING') {
    throw new Error('Round is already in progress');
  }
  if (activeBets.has(userId)) {
    throw new Error('You already placed a bet this round');
  }

  // Deduct from wallet first
  const debitRes = await debit(userId, amount, mode, 'Aviator Bet');
  if (!debitRes.success) {
    throw new Error(debitRes.error || 'Insufficient funds');
  }
  
  const bet: AviatorBet = { userId, amount, mode, cashedOut: false };
  activeBets.set(userId, bet);
  return { bet, newBalance: debitRes.newBalance };
};

export const cashOut = async (userId: string) => {
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
  const result = await credit(userId, winAmount, bet.mode, `Aviator Win (x${cashoutMultiplier})`);
  
  if (!result.success) {
    logger.error({ userId, winAmount }, 'Failed to credit player cashout!');
  }

  return { multiplier: cashoutMultiplier, winAmount, newBalance: result.newBalance };
};

const tickFlight = () => {
  if (!currentRound || currentRound.status !== 'FLYING') return;

  const elapsedTime = Date.now() - currentRound.startTime;
  // Multiplier formula: grows exponentially over time. 
  // Formula: multiplier = e^(0.06 * timeInSeconds)
  currentMultiplier = Math.pow(Math.E, 0.06 * (elapsedTime / 1000));

  if (currentMultiplier >= currentRound.crashPoint) {
    crashRound();
  } else {
    io.of('/aviator').emit('MULTIPLIER_TICK', { multiplier: currentMultiplier.toFixed(2) });
  }
};

const startFlying = () => {
  if (!currentRound) return;
  
  currentRound.status = 'FLYING';
  currentRound.startTime = Date.now();
  currentMultiplier = 1.0;
  
  io.of('/aviator').emit('ROUND_START', { 
    roundId: currentRound.id, 
    hash: currentRound.hash 
  });
  
  flightInterval = setInterval(tickFlight, TICK_RATE);
};

const crashRound = () => {
  if (flightInterval) clearInterval(flightInterval);
  if (!currentRound) return;

  currentRound.status = 'CRASHED';
  
  io.of('/aviator').emit('ROUND_CRASHED', {
    multiplier: currentRound.crashPoint,
    serverSeed: currentRound.serverSeed, // Reveal server seed for verification
  });
  
  // Clean up lost bets here (e.g. logging to database if necessary)
  const losers = Array.from(activeBets.values()).filter(b => !b.cashedOut);
  logger.info({ crashedAt: currentRound.crashPoint, losers: losers.length }, 'Round crashed');
  
  setTimeout(startNewRound, WAITING_TIME);
};

export const startNewRound = () => {
  const { serverSeed, clientSeed, crashPoint } = generateRoundOutcome();

  currentRound = {
    id: randomUUID(),
    serverSeed,
    clientSeed,
    hash: sha256(serverSeed),
    crashPoint,
    startTime: 0,
    status: 'WAITING',
  };

  currentMultiplier = 1.0;
  activeBets.clear();

  io.of('/aviator').emit('ROUND_WAITING', {
    roundId: currentRound.id,
    hash: currentRound.hash,
    waitTime: WAITING_TIME
  });

  logger.info({ roundId: currentRound.id, crashPoint: currentRound.crashPoint }, 'New Aviator round waiting');

  setTimeout(startFlying, WAITING_TIME);
};
