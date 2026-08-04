import { FastifyInstance } from 'fastify';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';

export const marketRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/price', async (request, reply) => {
    const { pair } = request.query as { pair: string };
    if (!pair) return reply.code(400).send({ error: 'Pair required' });

    // Try to fetch from Redis
    let price: number | null = null;
    let fromFallback = false;

    try {
      const raw = await redis.get(`market:${pair}`);
      if (raw !== null) {
        const parsed = parseFloat(String(raw));
        if (!isNaN(parsed)) {
          price = parsed;
        }
      }
    } catch (err) {
      logger.warn(`[Market] Redis error for ${pair}, using fallback`);
    }

    // If no price, generate a simulation
    if (price === null) {
      fromFallback = true;
      // Determine base price for the pair
      let basePrice = 150.0; // default for USD/KES
      if (pair === 'EUR/USD' || pair === 'GBP/USD') basePrice = 1.0;
      else if (pair === 'USD/JPY') basePrice = 130.0;
      else if (pair === 'EUR/KES') basePrice = 160.0;
      else if (pair === 'GBP/KES') basePrice = 180.0;
      else if (pair === 'XAU/USD') basePrice = 2000.0;

      // Random variation ±2%
      const variation = (Math.random() - 0.5) * 0.04; // ±2% range
      price = basePrice * (1 + variation);
      logger.warn(`[Market] No price in Redis for ${pair}, using simulated ${price.toFixed(4)}`);
    }

    // Add a tiny random jitter to simulate real-time ticks
    const variance = price > 50 ? 0.04 : 0.0002;
    const jitter = (Math.random() - 0.5) * variance;
    const finalPrice = price + jitter;

    return reply.send({ price: finalPrice });
  });
};
