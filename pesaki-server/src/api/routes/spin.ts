import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { playRound, getPrizes } from '../../games/spin/engine';
import { verifyAuth } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const spinSchema = z.object({
  amount: z.number().positive(),
  mode: z.enum(['real', 'demo']),
});

export const spinRoutes = async (fastify: FastifyInstance) => {
  // GET /games/spin/prizes — returns prizes for the frontend wheel
  fastify.get('/prizes', async (_, reply) => {
    try {
      const prizes = await getPrizes();
      return reply.send({ success: true, data: prizes });
    } catch (err: any) {
      logger.error(err, 'Failed to fetch spin prizes');
      return reply.code(500).send({ success: false, error: 'Could not load prizes' });
    }
  });

  fastify.post('/play', { preHandler: [verifyAuth] }, async (request, reply) => {
    const parsed = spinSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid payload', code: 'BAD_REQUEST' });
    }
    
    try {
      const result = await playRound(request.user!.id, parsed.data.amount, parsed.data.mode);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      logger.error(err, 'Spin engine error');
      return reply.code(400).send({ success: false, error: err.message, code: 'SPIN_ERROR' });
    }
  });
};
