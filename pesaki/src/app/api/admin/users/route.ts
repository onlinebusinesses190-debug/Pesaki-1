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

        // 2. Fetch users and their wallets
        const { data: users, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        return NextResponse.json({ users })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
