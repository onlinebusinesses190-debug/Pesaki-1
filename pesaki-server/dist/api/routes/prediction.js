"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictionRoutes = void 0;
const zod_1 = require("zod");
const engine_1 = require("../../games/prediction/engine");
const auth_1 = require("../../middleware/auth");
const logger_1 = require("../../utils/logger");
const predictionSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    mode: zod_1.z.enum(['real', 'demo']),
    market: zod_1.z.string(),
    direction: zod_1.z.enum(['UP', 'DOWN']),
    windowMinutes: zod_1.z.number().min(1),
});
const predictionRoutes = async (fastify) => {
    fastify.post('/place', { preHandler: [auth_1.verifyAuth] }, async (request, reply) => {
        const parsed = predictionSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: 'Invalid payload', code: 'BAD_REQUEST' });
        }
        try {
            const { amount, mode, market, direction, windowMinutes } = parsed.data;
            const result = await (0, engine_1.placePrediction)(request.user.id, market, direction, amount, mode, windowMinutes);
            return reply.send({ success: true, data: result.prediction, newBalance: result.newBalance });
        }
        catch (err) {
            logger_1.logger.error(err, 'Prediction engine error');
            return reply.code(400).send({ success: false, error: err.message, code: 'PREDICTION_ERROR' });
        }
    });
    // Expose manual run settle route (could restrict heavily in production)
    fastify.post('/settle', { preHandler: [auth_1.verifyAuth] }, async (request, reply) => {
        await (0, engine_1.settlePredictions)();
        return reply.send({ success: true });
    });
};
exports.predictionRoutes = predictionRoutes;
