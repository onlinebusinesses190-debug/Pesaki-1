import { FastifyInstance } from 'fastify';

export const testRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/ping', async (_, reply) => {
    reply.send({ status: 'ok' });
  });
};
