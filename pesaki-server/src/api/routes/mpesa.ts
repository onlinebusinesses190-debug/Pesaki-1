import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../../utils/logger';
import { credit } from '../../wallet/service';
import { supabase } from '../../lib/supabase';

export const mpesaRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const body: any = request.body;
    
    try {
      const stkCallback = body?.Body?.stkCallback;
      if (!stkCallback) return reply.code(200).send({ success: true });

      const checkoutRequestId = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;
      
      if (!checkoutRequestId) {
        logger.warn('Received M-Pesa webhook missing CheckoutRequestID');
        return reply.code(200).send({ success: true });
      }

      if (resultCode !== 0) {
        logger.info({ reason: resultDesc, checkoutRequestId }, 'M-Pesa payment failed or cancelled');
        await supabase.from('mpesa_deposits').update({ status: 'failed' }).eq('checkout_request_id', checkoutRequestId);
        return reply.code(200).send({ success: true }); // Always 200 for Safaricom
      }

      const callbackMetadata = stkCallback.CallbackMetadata;
      let amount = 0;
      let mpesaReceipt = '';

      if (callbackMetadata && callbackMetadata.Item) {
        callbackMetadata.Item.forEach((item: any) => {
          if (item.Name === 'Amount') amount = item.Value;
          if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value;
// Phone number handled by M-Pesa natively, not needed for inner logic
        });
      }

      // Look up user_id from mpesa_deposits
      const { data: depositData, error: depositError } = await supabase
        .from('mpesa_deposits')
        .select('user_id, status')
        .eq('checkout_request_id', checkoutRequestId)
        .single();
        
      if (depositError || !depositData) {
        logger.error({ error: depositError, checkoutRequestId }, 'Could not find pending deposit entry for webhook');
        return reply.code(200).send({ success: true });
      }

      if (depositData.status === 'completed') {
        logger.info({ checkoutRequestId }, 'Deposit already processed and credited');
        return reply.code(200).send({ success: true });
      }

      // Update to completed
      await supabase.from('mpesa_deposits').update({ status: 'completed' }).eq('checkout_request_id', checkoutRequestId);

      // Perform real credit
      await credit(depositData.user_id, amount, 'real', `M-Pesa Deposit: ${mpesaReceipt}`);
      logger.info({ mpesaReceipt, amount, userId: depositData.user_id }, 'Processed accepted M-PESA deposit');

    } catch (error) {
      logger.error(error, 'Error processing M-Pesa webhook');
    }

    return reply.code(200).send({ success: true });
  });
};
