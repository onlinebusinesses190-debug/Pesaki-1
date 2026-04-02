"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mpesaRoutes = void 0;
const logger_1 = require("../../utils/logger");
const service_1 = require("../../wallet/service");
const mpesaRoutes = async (fastify) => {
    fastify.post('/callback', async (request, reply) => {
        const body = request.body;
        try {
            // Very basic validation mapping Safaricom Daraja STK response body
            const resultCode = body?.Body?.stkCallback?.ResultCode;
            const resultDesc = body?.Body?.stkCallback?.ResultDesc;
            if (resultCode !== 0) {
                logger_1.logger.info({ reason: resultDesc }, 'M-Pesa payment failed or cancelled');
                return reply.code(200).send({ success: true }); // Always 200 for Safaricom
            }
            const callbackMetadata = body?.Body?.stkCallback?.CallbackMetadata;
            let amount = 0;
            let mpesaReceipt = '';
            let phoneNumber = '';
            if (callbackMetadata && callbackMetadata.Item) {
                callbackMetadata.Item.forEach((item) => {
                    if (item.Name === 'Amount')
                        amount = item.Value;
                    if (item.Name === 'MpesaReceiptNumber')
                        mpesaReceipt = item.Value;
                    if (item.Name === 'PhoneNumber')
                        phoneNumber = item.Value;
                });
            }
            // Normally, here we look up the user by the "CheckoutRequestID" which we would
            // have stored in an "mpesa_transactions" table when initiating the push.
            // Mocking credit manually for logic reference.
            const mockUserId = "some-user-id-from-db-lookup";
            await (0, service_1.credit)(mockUserId, amount, 'real', `M-Pesa Deposit: ${mpesaReceipt}`);
            logger_1.logger.info({ mpesaReceipt, amount }, 'Processed accepted M-PESA deposit');
        }
        catch (error) {
            logger_1.logger.error(error, 'Error processing M-Pesa webhook');
        }
        return reply.code(200).send({ success: true });
    });
};
exports.mpesaRoutes = mpesaRoutes;
