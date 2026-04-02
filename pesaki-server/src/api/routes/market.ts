import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { redis } from '../../lib/redis';

export const marketRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/price', async (request, reply) => {
    const { pair } = request.query as { pair: string };
    if (!pair) return reply.code(400).send({ error: 'Pair required' });

    const price = await redis.get(`market:${pair}`);
    if (!price) return reply.code(404).send({ error: 'Price not found' });

    const parsedPrice = parseFloat(String(price));
    if (Number.isNaN(parsedPrice)) {
      return reply.code(500).send({ error: 'Invalid price format' });
    }

    return reply.send({ price: parsedPrice });
  });
};
