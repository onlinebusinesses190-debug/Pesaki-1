"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketRoutes = void 0;
const redis_1 = require("../../lib/redis");
const marketRoutes = async (fastify) => {
    fastify.get('/price', async (request, reply) => {
        const { pair } = request.query;
        if (!pair)
            return reply.code(400).send({ error: 'Pair required' });
        const price = await redis_1.redis.get(`market:${pair}`);
        if (!price)
            return reply.code(404).send({ error: 'Price not found' });
        const parsedPrice = parseFloat(String(price));
        if (Number.isNaN(parsedPrice)) {
            return reply.code(500).send({ error: 'Invalid price format' });
        }
        return reply.send({ price: parsedPrice });
    });
};
exports.marketRoutes = marketRoutes;
