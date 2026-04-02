import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Check if user is admin
        const { data: profile, error: roleError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (roleError || profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Fetch platform metrics
        const { data: deposits } = await supabase
            .from('mpesa_deposits')
            .select('amount')
            .eq('status', 'completed')
        
        const { data: withdrawals } = await supabase
            .from('mpesa_withdrawals')
            .select('amount')
            .eq('status', 'completed')

        const { data: userCount } = await supabase
            .from('profiles')
            .select('id', { count: 'exact' })

        const { data: wallets } = await supabase
            .from('wallets')
            .select('balance')

        const totalDeposited = deposits?.reduce((a, b) => a + Number(b.amount), 0) || 0
        const totalWithdrawn = withdrawals?.reduce((a, b) => a + Number(b.amount), 0) || 0
        const totalUserBalance = wallets?.reduce((a, b) => a + Number(b.balance), 0) || 0

        return NextResponse.json({
            stats: {
                totalDeposits: totalDeposited,
                totalWithdrawals: totalWithdrawn,
                netProfit: totalDeposited - totalWithdrawn - totalUserBalance,
                totalUsers: userCount?.length || 0,
                totalUserBalance
            }
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
