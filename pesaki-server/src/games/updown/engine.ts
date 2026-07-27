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

  // ── Determine winning side (minority wins, draw = both lose) ──
  let winningDirection: 'up' | 'down' | null = null;
  let isDraw = false;

  if (totalUp === 0 && totalDown === 0) {
    // No bets – void? (should not happen, but handle gracefully)
    // We'll treat as void (refund) to be safe.
    winningDirection = null;
    isDraw = false;
  } else if (totalUp === totalDown) {
    // Draw in stakes → both lose
    winningDirection = null;
    isDraw = true;
  } else {
    // Minority wins: the side with the lower total stake
    winningDirection = totalUp < totalDown ? 'up' : 'down';
  }

  // ── Settle positions ──
  let successfulTrades = 0;
  for (const pos of positionsArray) {
    if (winningDirection === null && !isDraw) {
      // Void round (e.g., price movement zero) — refund everyone
      await credit(pos.userId, pos.amount, pos.mode, `Market Refund — Void round (${currentRound.market})`);
      await supabase.from('predictions').update({ status: 'cancelled', close_price: closePrice })
        .eq('id', pos.predictionId);
    } else if (isDraw || (winningDirection && pos.direction !== winningDirection)) {
      // Loser — loses 100% (no credit)
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
      // Fallback: mark settled
      await supabase.from('predictions').update({ status: 'settled', close_price: closePrice })
        .eq('id', pos.predictionId);
    }
  }

  // ── History entry ──
  if (closePrice !== null) {
    roundHistory.push({
      roundId: currentRound.id,
      direction: winningDirection, // null for draw or void
      entryPrice: currentRound.entryPrice,
      closePrice,
      settledAt: new Date().toISOString(),
    });
    if (roundHistory.length > MAX_HISTORY) roundHistory.shift();
  }

  // ── Emit result with totals ──
  const resultPayload = {
    roundId: currentRound.id,
    market: currentRound.market,
    entryPrice: currentRound.entryPrice,
    closePrice,
    direction: priceDirection,        // actual price movement (for info)
    winningDirection,                // minority side that won, or null for draw/void
    totalUp,
    totalDown,
    winners: successfulTrades,
    payoutMultiplier: 1.5,
    isDraw,                          // indicate draw for frontend if needed
  };

  io.of('/updown').emit('UPDOWN_ROUND_RESULT', resultPayload);

  logger.info({ ...resultPayload, totalPositions: positionsArray.length }, 'Up/Down round RESULT');

  setTimeout(startOpen, RESULT_DURATION);
};
