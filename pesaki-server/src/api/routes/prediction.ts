import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { placePrediction, settlePredictions } from '../../games/prediction/engine';
import { verifyAuth } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const predictionSchema = z.object({
  amount: z.number().positive(),
  mode: z.enum(['real', 'demo']),
  market: z.string(),
  direction: z.enum(['UP', 'DOWN']),
  windowMinutes: z.number().min(1),
});

export const predictionRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/place', { preHandler: [verifyAuth] }, async (request, reply) => {
    const parsed = predictionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid payload', code: 'BAD_REQUEST' });
    }
    
    try {
      const { amount, mode, market, direction, windowMinutes } = parsed.data;
      const result = await placePrediction(request.user!.id, market, direction, amount, mode, windowMinutes);
      return reply.send({ success: true, data: result.prediction, newBalance: result.newBalance });
    } catch (err: any) {
      logger.error(err, 'Prediction engine error');
      return reply.code(400).send({ success: false, error: err.message, code: 'PREDICTION_ERROR' });
    }
  });
  
  // Expose manual run settle route (could restrict heavily in production)
  fastify.post('/settle', { preHandler: [verifyAuth] }, async (_, reply) => {
     await settlePredictions();
     return reply.send({ success: true });
  });
};
