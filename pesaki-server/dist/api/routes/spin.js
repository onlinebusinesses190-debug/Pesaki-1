"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spinRoutes = void 0;
const zod_1 = require("zod");
const engine_1 = require("../../games/spin/engine");
const auth_1 = require("../../middleware/auth");
const logger_1 = require("../../utils/logger");
const spinSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    mode: zod_1.z.enum(['real', 'demo']),
});
const spinRoutes = async (fastify) => {
    fastify.post('/play', { preHandler: [auth_1.verifyAuth] }, async (request, reply) => {
        const parsed = spinSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: 'Invalid payload', code: 'BAD_REQUEST' });
        }
        try {
            const result = await (0, engine_1.playRound)(request.user.id, parsed.data.amount, parsed.data.mode);
            return reply.send({ success: true, data: result });
        }
        catch (err) {
            logger_1.logger.error(err, 'Spin engine error');
            return reply.code(400).send({ success: false, error: err.message, code: 'SPIN_ERROR' });
        }
    });
};
exports.spinRoutes = spinRoutes;
