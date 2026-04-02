"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRoutes = void 0;
const zod_1 = require("zod");
const service_1 = require("../../wallet/service");
const auth_1 = require("../../middleware/auth");
const transferSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    mode: zod_1.z.enum(['real', 'demo']),
});
const walletRoutes = async (fastify) => {
    fastify.get('/balance', { preHandler: [auth_1.verifyAuth] }, async (request, reply) => {
        const { mode } = request.query;
        if (!mode || (mode !== 'real' && mode !== 'demo')) {
            return reply.code(400).send({ success: false, error: 'Valid mode required', code: 'BAD_REQUEST' });
        }
        const balance = await (0, service_1.getBalance)(request.user.id, mode);
        return reply.send({ success: true, data: { balance } });
    });
    fastify.post('/deposit', { preHandler: [auth_1.verifyAuth] }, async (request, reply) => {
        const parsed = transferSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: 'Invalid payload', code: 'BAD_REQUEST' });
        }
        const result = await (0, service_1.credit)(request.user.id, parsed.data.amount, parsed.data.mode, 'User Deposit');
        return reply.send(result);
    });
    fastify.post('/withdraw', { preHandler: [auth_1.verifyAuth] }, async (request, reply) => {
        const parsed = transferSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: 'Invalid payload', code: 'BAD_REQUEST' });
        }
        const result = await (0, service_1.debit)(request.user.id, parsed.data.amount, parsed.data.mode, 'User Withdrawal');
        return reply.send(result);
    });
};
exports.walletRoutes = walletRoutes;
