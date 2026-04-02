import crypto from 'crypto';
import { supabase } from '../../lib/supabase';
import { debit, credit } from '../../wallet/service';
import { logger } from '../../utils/logger';
import { redis } from '../../lib/redis';
import { SpinPrize } from './types';

const PRIZES_CACHE_KEY = 'spin:prizes';
const PRIZES_CACHE_TTL = 300; // 5 minutes in seconds

export const getPrizes = async (): Promise<SpinPrize[]> => {
  // Try cache first
  const cached = await redis.get(PRIZES_CACHE_KEY);
  if (cached) {
    logger.info('Spin prizes loaded from Redis cache');
    return (typeof cached === 'string' ? JSON.parse(cached) : cached) as SpinPrize[];
  }

  // Fall back to DB, ordered consistently so index always matches
  const { data: prizes, error } = await supabase
    .from('spin_prizes')
    .select('*')
    .order('id', { ascending: true });

  if (error || !prizes || prizes.length === 0) {
    throw new Error('No prizes configured');
  }

  // Cache for 5 minutes
  await redis.set(PRIZES_CACHE_KEY, JSON.stringify(prizes), { ex: PRIZES_CACHE_TTL });
  logger.info({ count: prizes.length }, 'Spin prizes fetched from DB and cached');

  return prizes as SpinPrize[];
};

export const playRound = async (userId: string, betAmount: number, mode: 'real' | 'demo') => {
  if (betAmount <= 0) throw new Error('Bet amount must be positive');

  // Deduct from wallet first (fail fast before any RNG)
  const debitRes = await debit(userId, betAmount, mode, 'Spin Wheel Bet');
  if (!debitRes.success) {
    throw new Error(debitRes.error || 'Failed to process bet');
  }

  // Fetch prizes (cached)
  const prizes = await getPrizes();

  // Weighted random selection
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  const randomValue = crypto.randomInt(0, totalWeight);
  
  let currentWeight = 0;
  let wonPrize = prizes[0] as SpinPrize;
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
  const { error: insertErr } = await supabase.from('spin_results').insert([
    {
      user_id: userId,
      bet_amount: betAmount,
      prize_id: wonPrize.id,
      prize_value: winAmount,
      mode
    }
  ]);
  if (insertErr) {
    logger.error(insertErr, 'Failed to log spin result');
  }

  // Credit winnings if any
  let finalBalance = debitRes.newBalance;
  if (winAmount > 0) {
    const creditRes = await credit(userId, winAmount, mode, `Spin Win - ${wonPrize.name} (${wonPrize.value}x)`);
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
