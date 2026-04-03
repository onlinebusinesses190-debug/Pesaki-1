"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mpesaRoutes = void 0;
const logger_1 = require("../../utils/logger");
const service_1 = require("../../wallet/service");
const supabase_1 = require("../../lib/supabase");
const mpesaRoutes = async (fastify) => {
    fastify.post('/callback', async (request, reply) => {
        const body = request.body;
        try {
            const stkCallback = body?.Body?.stkCallback;
            if (!stkCallback)
                return reply.code(200).send({ success: true });
            const checkoutRequestId = stkCallback.CheckoutRequestID;
            const resultCode = stkCallback.ResultCode;
            const resultDesc = stkCallback.ResultDesc;
            if (!checkoutRequestId) {
                logger_1.logger.warn('Received M-Pesa webhook missing CheckoutRequestID');
                return reply.code(200).send({ success: true });
            }
            if (resultCode !== 0) {
                logger_1.logger.info({ reason: resultDesc, checkoutRequestId }, 'M-Pesa payment failed or cancelled');
                await supabase_1.supabase.from('mpesa_deposits').update({ status: 'failed' }).eq('checkout_request_id', checkoutRequestId);
                return reply.code(200).send({ success: true }); // Always 200 for Safaricom
            }
            const callbackMetadata = stkCallback.CallbackMetadata;
            let amount = 0;
            let mpesaReceipt = '';
            if (callbackMetadata && callbackMetadata.Item) {
                callbackMetadata.Item.forEach((item) => {
                    if (item.Name === 'Amount')
                        amount = item.Value;
                    if (item.Name === 'MpesaReceiptNumber')
                        mpesaReceipt = item.Value;
                    // Phone number handled by M-Pesa natively, not needed for inner logic
                });
            }
            // Look up user_id from mpesa_deposits
            const { data: depositData, error: depositError } = await supabase_1.supabase
                .from('mpesa_deposits')
                .select('user_id, status')
                .eq('checkout_request_id', checkoutRequestId)
                .single();
            if (depositError || !depositData) {
                logger_1.logger.error({ error: depositError, checkoutRequestId }, 'Could not find pending deposit entry for webhook');
                return reply.code(200).send({ success: true });
            }
            if (depositData.status === 'completed') {
                logger_1.logger.info({ checkoutRequestId }, 'Deposit already processed and credited');
                return reply.code(200).send({ success: true });
            }
            // Update to completed
            await supabase_1.supabase.from('mpesa_deposits').update({ status: 'completed' }).eq('checkout_request_id', checkoutRequestId);
            // Perform real credit
            await (0, service_1.credit)(depositData.user_id, amount, 'real', `M-Pesa Deposit: ${mpesaReceipt}`);
            logger_1.logger.info({ mpesaReceipt, amount, userId: depositData.user_id }, 'Processed accepted M-PESA deposit');
        }
        catch (error) {
            logger_1.logger.error(error, 'Error processing M-Pesa webhook');
        }
        return reply.code(200).send({ success: true });
    });
};
exports.mpesaRoutes = mpesaRoutes;
