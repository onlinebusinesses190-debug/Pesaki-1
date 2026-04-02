import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { redis } from '../../lib/redis';
import { debit, credit } from '../../wallet/service';
import { fetchNsePrice, isNseSymbol } from '../../utils/nse';

export const placePrediction = async (
  userId: string, 
  market: string, 
  direction: 'UP' | 'DOWN', 
  amount: number, 
  mode: 'real' | 'demo', 
  windowMinutes: number
) => {
  // Check market price
  const cachedPriceStr = await redis.get(`market:${market}`);
  if (!cachedPriceStr) {
    throw new Error('Market price currently unavailable');
  }
  const entryPrice = parseFloat(String(cachedPriceStr));

  // Debit funds
  const debitRes = await debit(userId, amount, mode, `Prediction on ${market}`);
  if (!debitRes.success) {
    throw new Error(debitRes.error || 'Failed to process bet');
  }

  const closeDate = new Date();
  closeDate.setMinutes(closeDate.getMinutes() + windowMinutes);
  
  const { data, error } = await supabase.from('predictions').insert([
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
     logger.error(error, 'Prediction insertion failed');
     await credit(userId, amount, mode, `Refund: Prediction on ${market} failed`);
     throw new Error('Database error saving prediction');
  }

  return { success: true, prediction: data, newBalance: debitRes.newBalance };
};

export const settlePredictions = async () => {
    logger.info('Running prediction settlement job...');
    
    const now = new Date().toISOString();
    const { data: pending, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('status', 'pending')
      .lte('window_close_at', now);
      
    if (error || !pending || pending.length === 0) {
      return; 
    }
    
    // Group by market for batching (though NSE is per stock)
    const markets = new Set<string>();
    pending.forEach((p) => markets.add(p.market));
    
    const closePrices = new Map<string, number>();
    for (const m of Array.from(markets)) {
        if (isNseSymbol(m)) {
          // NSE Stock – Fetch via scraper
          const price = await fetchNsePrice(m);
          if (price) closePrices.set(m, price);
        } else {
          // Real-time market (Crypto/FX) – Fetch via Redis
          const pStr = await redis.get(`market:${m}`);
          if (pStr) closePrices.set(m, parseFloat(String(pStr)));
        }
    }
    
    for (const prediction of pending) {
        const { id, user_id, market, direction, entry_price, amount, mode } = prediction;
        
        const closePrice = closePrices.get(market);
        if (closePrice === undefined) {
          logger.warn(`No closing price found for ${market}. Skipping settlement for prediction ${id}.`);
          continue; // Wait until next tick to try again
        }
        
        const won = (direction === 'up' && closePrice > entry_price) || 
                    (direction === 'down' && closePrice < entry_price);
                    
        if (won) {
            const winAmount = Number((amount * 1.9).toFixed(2)); // 1.9x payout = 5% house edge
            await credit(user_id, winAmount, mode, `Prediction Won on ${market}`);
        }
        
        await supabase.from('predictions').update({ status: 'settled', close_price: closePrice }).eq('id', id);
    }
    logger.info(`Settled ${pending.length} predictions`);
};
