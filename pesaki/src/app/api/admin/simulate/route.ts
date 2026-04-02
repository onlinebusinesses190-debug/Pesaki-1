import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Admin Check
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { type } = await request.json()

        if (type === 'deposit') {
            // Find latest pending deposit
            const { data: deposit } = await supabase
                .from('mpesa_deposits')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (!deposit) return NextResponse.json({ error: 'No pending deposit found' }, { status: 404 })

            // Simulate Success (Credit Wallet)
            const { error: creditError } = await supabase.rpc('credit_wallet', {
                p_user_id: deposit.user_id,
                p_amount: deposit.amount,
                p_mode: 'real',
                p_description: `M-Pesa Deposit [Simulated] - ${deposit.checkout_request_id}`
            })

            if (creditError) throw creditError

            await supabase
                .from('mpesa_deposits')
                .update({ status: 'completed' })
                .eq('checkout_request_id', deposit.checkout_request_id)

            return NextResponse.json({ success: true, message: `Simulated successful deposit of ${deposit.amount} KSh` })
        }

        if (type === 'withdraw_success' || type === 'withdraw_fail') {
            // Find latest pending withdrawal
            const { data: withdrawal } = await supabase
                .from('mpesa_withdrawals')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (!withdrawal) return NextResponse.json({ error: 'No pending withdrawal found' }, { status: 404 })

            if (type === 'withdraw_success') {
                await supabase
                    .from('mpesa_withdrawals')
                    .update({ status: 'completed' })
                    .eq('conversation_id', withdrawal.conversation_id)

                return NextResponse.json({ success: true, message: `Simulated successful withdrawal of ${withdrawal.amount} KSh` })
            } else {
                // Simulate Failure (Refund Wallet)
                const { error: refundError } = await supabase.rpc('credit_wallet', {
                    p_user_id: withdrawal.user_id,
                    p_amount: withdrawal.amount,
                    p_mode: 'real',
                    p_description: `Refund: Withdrawal Failed [Simulated] - ${withdrawal.conversation_id}`
                })

                if (refundError) throw refundError

                await supabase
                    .from('mpesa_withdrawals')
                    .update({ status: 'failed' })
                    .eq('conversation_id', withdrawal.conversation_id)

                return NextResponse.json({ success: true, message: `Simulated failed withdrawal and refunded ${withdrawal.amount} KSh` })
            }
        }

        return NextResponse.json({ error: 'Invalid simulation type' }, { status: 400 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Simulation error' }, { status: 500 })
    }
}
