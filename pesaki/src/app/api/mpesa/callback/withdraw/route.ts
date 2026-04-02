import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    try {
        const payload = await request.json()
        const { Result } = payload

        if (!Result) {
            return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 })
        }

        const {
            ConversationID,
            OriginatorConversationID,
            ResultCode,
            ResultDesc,
            ResultParameters
        } = Result

        const supabase = await createClient()

        // 1. Fetch the corresponding withdrawal
        const { data: withdrawal, error: fetchError } = await supabase
            .from('mpesa_withdrawals')
            .select('*')
            .eq('conversation_id', ConversationID)
            .single()

        if (fetchError || !withdrawal) {
            console.error('[Withdrawal Callback] Record not found:', ConversationID)
            return NextResponse.json({ success: true }) // Accept callback but log error
        }

        if (withdrawal.status !== 'pending') {
            return NextResponse.json({ success: true }) // Already processed
        }

        const isSuccess = ResultCode === 0

        // 2. Update withdrawal status
        await supabase
            .from('mpesa_withdrawals')
            .update({
                status: isSuccess ? 'completed' : 'failed',
                result_code: ResultCode.toString(),
                result_desc: ResultDesc,
                updated_at: new Date().toISOString()
            })
            .eq('conversation_id', ConversationID)

        // 3. If failed, refund the user immediately
        if (!isSuccess) {
            await supabase.rpc('credit_wallet', {
                p_user_id: withdrawal.user_id,
                p_amount: withdrawal.amount,
                p_mode: 'real',
                p_description: `Refund: M-Pesa withdrawal to ${withdrawal.phone} failed (${ResultDesc})`
            })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[Withdrawal Callback Exception]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
