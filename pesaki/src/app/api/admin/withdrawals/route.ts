import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const { data: profile, error: roleError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (roleError || profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: withdrawals, error: fetchError } = await supabaseAdmin
            .from('mpesa_withdrawals')
            .select(`
                conversation_id,
                amount,
                phone,
                status,
                created_at,
                user_id,
                profiles(phone)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        return NextResponse.json({ withdrawals })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const { data: profile, error: roleError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (roleError || profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { conversationId, action } = body // action: 'approve' | 'reject'

        if (!conversationId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Fetch the withdrawal record
        const { data: withdrawal, error: wError } = await supabaseAdmin
            .from('mpesa_withdrawals')
            .select('*')
            .eq('conversation_id', conversationId)
            .single()

        if (wError || !withdrawal) {
            return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
        }

        if (withdrawal.status !== 'pending') {
            return NextResponse.json({ error: 'Withdrawal is not pending' }, { status: 400 })
        }

        if (action === 'approve') {
            // Update status to completed
            const { error: updateError } = await supabaseAdmin
                .from('mpesa_withdrawals')
                .update({ 
                    status: 'completed',
                    result_desc: 'Manually processed by admin',
                    updated_at: new Date().toISOString()
                })
                .eq('conversation_id', conversationId)

            if (updateError) throw updateError

            return NextResponse.json({ success: true, message: 'Withdrawal marked as completed' })
        } 
        
        if (action === 'reject') {
            // 1. Refund the user via RPC
            const { error: refundError } = await supabaseAdmin.rpc('credit_wallet', {
                p_user_id: withdrawal.user_id,
                p_amount: withdrawal.amount,
                p_mode: 'real',
                p_description: 'Refund: Manual Withdrawal Rejected'
            })

            if (refundError) throw refundError

            // 2. Update status to failed
            const { error: updateError } = await supabaseAdmin
                .from('mpesa_withdrawals')
                .update({ 
                    status: 'failed',
                    result_desc: 'Manually rejected by admin - Refunded',
                    updated_at: new Date().toISOString()
                })
                .eq('conversation_id', conversationId)

            if (updateError) throw updateError

            return NextResponse.json({ success: true, message: 'Withdrawal rejected and refunded' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
