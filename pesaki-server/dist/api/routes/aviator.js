"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aviatorRoutes = void 0;
const zod_1 = require("zod");
const engine_1 = require("../../games/aviator/engine");
const auth_1 = require("../../middleware/auth");
const betSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    mode: zod_1.z.enum(['real', 'demo']),
});
const aviatorRoutes = async (fastify) => {
    fastify.post('/bet', { preHandler: [auth_1.verifyAuth] }, async (request, reply) => {
        const parsed = betSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: 'Invalid payload', code: 'BAD_REQUEST' });
        }
        try {
            const bet = (0, engine_1.placeBet)(request.user.id, parsed.data.amount, parsed.data.mode);
            return reply.send({ success: true, data: { bet } });
        }
        catch (err) {
            return reply.code(400).send({ success: false, error: err.message, code: 'AVIATOR_ERROR' });
        }
    });
    // CASHOUT is handled natively via Socket IO directly to reduce latency.
    // We don't expose it here to avoid duplication unless specifically requested.
};
exports.aviatorRoutes = aviatorRoutes;
