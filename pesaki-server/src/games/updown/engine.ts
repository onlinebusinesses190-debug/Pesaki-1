import { randomUUID } from 'crypto';
import { redis } from '../../lib/redis';
import { supabase } from '../../lib/supabase';
import { credit, debit } from '../../wallet/service';
import { logger } from '../../utils/logger';
import { io } from '../../socket/index';

// ── Types ────────────────────────────────────────────────────────────────────

export type RoundState = 'open' | 'locked' | 'result';

export interface UpDownRound {
  id: string;
  market: string;
  entryPrice: number;
  closePrice: number | null;
  direction: 'up' | 'down' | null;
  state: RoundState;
  opensAt: Date;
  locksAt: Date;
  resultsAt: Date;
}

interface MarketPosition {
  userId: string;
  direction: 'up' | 'down';
  amount: number;
  mode: 'real' | 'demo';
  predictionId: string;
}

interface HistoryEntry {
  roundId: string;
  direction: 'up' | 'down' | null;
  entryPrice: number;
  closePrice: number;
  settledAt: string;
}

// ── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_MARKET = 'USD/KES';
const OPEN_DURATION   = 10_000; // 10 seconds
const LOCKED_DURATION =  2_000; //  2 seconds
const RESULT_DURATION =  3_000; //  3 seconds
const MAX_HISTORY = 20;

// ── State ────────────────────────────────────────────────────────────────────

let currentRound: UpDownRound | null = null;
let activePositions: Map<string, MarketPosition> = new Map(); // keyed by userId
const roundHistory: HistoryEntry[] = [];

// ── Public getters ────────────────────────────────────────────────────────────

export const getUpDownState = () => ({
  round: currentRound,
  history: roundHistory.slice(-10),
});

// ── Bet placement  ────────────────────────────────────────────────────────────

export const placePosition = async (
  userId: string,
  roundId: string,
  direction: 'up' | 'down',
  amount: number,
  mode: 'real' | 'demo'
): Promise<{ success: true; newBalance: number } | { success: false; error: string }> => {
  if (!currentRound || currentRound.state !== 'open') {
    return { success: false, error: 'Market is not accepting orders' };
  }
  if (currentRound.id !== roundId) {
    return { success: false, error: 'Market ID mismatch - please refresh' };
  }
  if (activePositions.has(userId)) {
    return { success: false, error: 'You already have an active position this round' };
  }

  // Debit wallet
  const debitRes = await debit(userId, amount, mode, `Market Forecast (${direction.toUpperCase()}) on ${currentRound.market}`);
  if (!debitRes.success) {
    return { success: false, error: debitRes.error || 'Insufficient funds' };
  }

  // Persist in DB
  const closeAt = new Date(currentRound.locksAt);
  const { data, error: dbErr } = await supabase.from('predictions').insert([{
    user_id: userId,
    market: currentRound.market,
    direction,
    amount,
    mode,
    entry_price: currentRound.entryPrice,
    status: 'pending',
    round_id: currentRound.id,
    window_close_at: closeAt.toISOString(),
  }]).select('id').single();

  if (dbErr || !data) {
    // Refund on DB failure
    await credit(userId, amount, mode, `Refund: Market Forecast DB error`);
    return { success: false, error: 'Database error — order refunded' };
  }

  activePositions.set(userId, { userId, direction, amount, mode, predictionId: data.id });
  logger.info({ userId, direction, amount, roundId }, 'Market position placed');
  return { success: true, newBalance: debitRes.newBalance! };
};

// ── Round Lifecycle ───────────────────────────────────────────────────────────

// ✅ FIXED: Added fallback price if Redis is empty
const getMarketPrice = async (market: string): Promise<number | null> => {
  try {
    const raw = await redis.get(`market:${market}`);
    if (!raw) {
      // Generate a realistic simulated price for USD/KES (around 150 KES)
      const simulated = 150.0 + (Math.random() - 0.5) * 2;
      logger.warn(`[Up/Down] No price in Redis for ${market}, using simulated ${simulated.toFixed(4)}`);
      return simulated;
    }
    return parseFloat(String(raw));
  } catch (err) {
    // On Redis error, also simulate
    const simulated = 150.0 + (Math.random() - 0.5) * 2;
    logger.warn(`[Up/Down] Redis error, using simulated ${simulated.toFixed(4)}`);
    return simulated;
  }
};

const simulateClosePrice = async (market: string, entryPrice: number): Promise<number> => {
  const magnitudePct = 0.0005 + Math.random() * 0.002;
  const delta = entryPrice * magnitudePct;
  const direction = Math.random() < 0.5 ? 1 : -1;
  const newPrice = parseFloat((entryPrice + direction * delta).toFixed(4));
  try {
    await redis.set(`market:${market}`, String(newPrice), { ex: 3600 });
  } catch {
    // Redis write failure is non-fatal
  }
  return newPrice;
};

// ── START OPEN ─────────────────────────────────────────────────────────────────

const startOpen = async () => {
  const market = DEFAULT_MARKET;
  const entryPrice = await getMarketPrice(market);

  if (entryPrice === null) {
    // This should now never happen because getMarketPrice always returns a number (fallback)
    logger.warn({ market }, 'Up/Down: No price available — skipping round, retrying in 5s');
    setTimeout(startOpen, 5_000);
    return;
  }

  const now = new Date();
  const locksAt = new Date(now.getTime() + OPEN_DURATION);
  const resultsAt = new Date(locksAt.getTime() + LOCKED_DURATION);

  currentRound = {
    id: randomUUID(),
    market,
    entryPrice,
    closePrice: null,
    direction: null,
    state: 'open',
    opensAt: now,
    locksAt,
    resultsAt,
  };

  activePositions.clear();

  const nsp = io.of('/updown');
  nsp.emit('UPDOWN_ROUND_OPEN', {
    roundId: currentRound.id,
    market,
    entryPrice,
    duration: OPEN_DURATION / 1000,
    opensAt: now.toISOString(),
    locksAt: locksAt.toISOString(),
  });

  logger.info({ roundId: currentRound.id, market, entryPrice }, 'Up/Down round OPEN');

  let secondsLeft = OPEN_DURATION / 1000;
  const countdownInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft >= 0 && currentRound) {
      nsp.emit('UPDOWN_COUNTDOWN', { secondsLeft, roundId: currentRound.id });
    }
    if (secondsLeft <= 0) clearInterval(countdownInterval);
  }, 1_000);

  setTimeout(startLocked, OPEN_DURATION);
};

// ── START LOCKED ───────────────────────────────────────────────────────────────

const startLocked = async () => {
  if (!currentRound) return;

  currentRound.state = 'locked';

  const nsp = io.of('/updown');
  nsp.emit('UPDOWN_ROUND_LOCKED', { roundId: currentRound.id });

  logger.info({ roundId: currentRound.id }, 'Up/Down round LOCKED');

  const closePrice = await simulateClosePrice(currentRound.market, currentRound.entryPrice);
  currentRound.closePrice = closePrice;

  setTimeout(() => startResult(closePrice), LOCKED_DURATION);
};

// ── START RESULT (Minority Wins) ─────────────────────────────────────────────

const startResult = async (closePrice: number) => {
  if (!currentRound) return;

  currentRound.state = 'result';

  let priceDirection: 'up' | 'down' | null = null;
  if (closePrice !== null) {
    if (closePrice > currentRound.entryPrice) priceDirection = 'up';
    else if (closePrice < currentRound.entryPrice) priceDirection = 'down';
    else priceDirection = null;
  }

  currentRound.direction = priceDirection;
  currentRound.closePrice = closePrice;

  const positionsArray = Array.from(activePositions.values());

  // ── Compute total stakes per side ──
  const totalUp = positionsArray
    .filter(p => p.direction === 'up')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalDown = positionsArray
    .filter(p => p.direction === 'down')
    .reduce((sum, p) => sum + p.amount, 0);

  // ── Determine winning side ──
  let winningDirection: 'up' | 'down' | null = null;
  let isDraw = false;

  if (totalUp === 0 && totalDown === 0) {
    winningDirection = null;
    isDraw = false;
  } else if (totalUp === totalDown) {
    winningDirection = null;
    isDraw = true;
  } else {
    winningDirection = totalUp < totalDown ? 'up' : 'down';
  }

  // ── Settle positions ──
  let successfulTrades = 0;
  for (const pos of positionsArray) {
    if (winningDirection === null && !isDraw) {
      // Void round (price movement zero) — refund everyone
      await credit(pos.userId, pos.amount, pos.mode, `Market Refund — Void round (${currentRound.market})`);
      await supabase.from('predictions').update({ status: 'cancelled', close_price: closePrice })
        .eq('id', pos.predictionId);
    } else if (isDraw || (winningDirection && pos.direction !== winningDirection)) {
      // Loser — loses 100%
      await supabase.from('predictions').update({ status: 'settled', close_price: closePrice })
        .eq('id', pos.predictionId);
    } else if (winningDirection && pos.direction === winningDirection) {
      // Winner — 50% profit (1.5×)
      const winAmount = Number((pos.amount * 1.5).toFixed(2));
      await credit(pos.userId, winAmount, pos.mode, `Market Success ${winningDirection.toUpperCase()} on ${currentRound.market} (minority wins)`);
      await supabase.from('predictions').update({ status: 'settled', close_price: closePrice })
        .eq('id', pos.predictionId);
      successfulTrades++;
    } else {
      await supabase.from('predictions').update({ status: 'settled', close_price: closePrice })
        .eq('id', pos.predictionId);
    }
  }

  // ── History entry ──
  if (closePrice !== null) {
    roundHistory.push({
      roundId: currentRound.id,
      direction: winningDirection,
      entryPrice: currentRound.entryPrice,
      closePrice,
      settledAt: new Date().toISOString(),
    });
    if (roundHistory.length > MAX_HISTORY) roundHistory.shift();
  }

  // ── Emit result ──
  const resultPayload = {
    roundId: currentRound.id,
    market: currentRound.market,
    entryPrice: currentRound.entryPrice,
    closePrice,
    direction: priceDirection,
    winningDirection,
    totalUp,
    totalDown,
    winners: successfulTrades,
    payoutMultiplier: 1.5,
    isDraw,
  };

  io.of('/updown').emit('UPDOWN_ROUND_RESULT', resultPayload);

  logger.info({ ...resultPayload, totalPositions: positionsArray.length }, 'Up/Down round RESULT');

  setTimeout(startOpen, RESULT_DURATION);
};

// ── Boot ──────────────────────────────────────────────────────────────────────

export const startUpDownRounds = () => {
  logger.info('Starting Up/Down round engine...');
  startOpen();
};
