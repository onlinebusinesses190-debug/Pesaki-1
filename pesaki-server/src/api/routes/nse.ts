import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyAuth } from '../../middleware/auth';
import { placeNsePrediction } from '../../games/nse/engine';
import { logger } from '../../utils/logger';

const nsePredictSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(['UP', 'DOWN']),
  amount: z.number().min(10), // Min 10 KSh
  mode: z.enum(['real', 'demo']),
  entryPrice: z.number().positive(),
});

export const nseRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/predict', { preHandler: [verifyAuth] }, async (request, reply) => {
    const parsed = nsePredictSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid payload', details: parsed.error.format() });
    }

    try {
      const { symbol, direction, amount, mode, entryPrice } = parsed.data;
      const result = await placeNsePrediction(
        request.user!.id,
        symbol,
        direction,
        amount,
        mode,
        entryPrice
      );

      return reply.send({
        success: true,
        message: `Prediction for ${symbol} placed successfully. Settlements happen at 15:00 EAT.`,
        data: result
      });
    } catch (err: any) {
      logger.error(err, 'NSE prediction route error');
      return reply.code(400).send({ success: false, error: err.message });
    }
  });
};
