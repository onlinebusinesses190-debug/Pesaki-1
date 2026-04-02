"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nseRoutes = void 0;
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const engine_1 = require("../../games/nse/engine");
const logger_1 = require("../../utils/logger");
const nsePredictSchema = zod_1.z.object({
    symbol: zod_1.z.string().min(1),
    direction: zod_1.z.enum(['UP', 'DOWN']),
    amount: zod_1.z.number().min(10), // Min 10 KSh
    mode: zod_1.z.enum(['real', 'demo']),
    entryPrice: zod_1.z.number().positive(),
});
const nseRoutes = async (fastify) => {
    fastify.post('/predict', { preHandler: [auth_1.verifyAuth] }, async (request, reply) => {
        const parsed = nsePredictSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: 'Invalid payload', details: parsed.error.format() });
        }
        try {
            const { symbol, direction, amount, mode, entryPrice } = parsed.data;
            const result = await (0, engine_1.placeNsePrediction)(request.user.id, symbol, direction, amount, mode, entryPrice);
            return reply.send({
                success: true,
                message: `Prediction for ${symbol} placed successfully. Settlements happen at 15:00 EAT.`,
                data: result
            });
        }
        catch (err) {
            logger_1.logger.error(err, 'NSE prediction route error');
            return reply.code(400).send({ success: false, error: err.message });
        }
    });
};
exports.nseRoutes = nseRoutes;
