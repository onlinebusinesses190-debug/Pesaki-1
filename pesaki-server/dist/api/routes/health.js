"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const healthRoutes = async (fastify) => {
    fastify.get('/health', async (_, reply) => {
        return reply.send({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: Date.now(),
        });
    });
};
exports.healthRoutes = healthRoutes;
