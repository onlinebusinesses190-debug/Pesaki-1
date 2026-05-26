import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.DARAJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

async function getDarajaToken(): Promise<string> {
    const consumerKey = (process.env.DARAJA_CONSUMER_KEY || '').trim()
    const consumerSecret = (process.env.DARAJA_CONSUMER_SECRET || '').trim()

    if (!consumerKey || !consumerSecret) {
        throw new Error('Missing Daraja consumer key/secret in environment')
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: { Authorization: `Basic ${credentials}` },
        cache: 'no-store',
    })
    
    if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Failed to fetch Daraja token: ${res.status} ${txt}`)
    }
    const data = await res.json()
    if (!data?.access_token) throw new Error(`Daraja token response missing access_token: ${JSON.stringify(data)}`)
    return data.access_token
}

export async function POST(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { amount } = await request.json()
        const withdrawalAmount = Number(amount)

        if (!withdrawalAmount || withdrawalAmount < 100) {
            return NextResponse.json({ error: 'Minimum withdrawal is KSh 100' }, { status: 400 })
        }

        // 1. Fetch profile for phone and to check balance via internal wallet logic
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', user.id)
            .single()

        if (profileError || !profile?.phone) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Normalize phone
        let phone = profile.phone.replace(/\D/g, '')
        if (phone.startsWith('0')) phone = '254' + phone.slice(1)
        if (phone.length !== 12) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })

        // 2. Lock funds using the debit_wallet RPC (Server side check happens here)
        // We use the pesaki-server API URL if possible, or we define it here. 
        // Actually, let's use a direct RPC call via supabase client for speed.
        const { data: newBalance, error: debitError } = await supabase.rpc('debit_wallet', {
            p_user_id: user.id,
            p_amount: withdrawalAmount,
            p_mode: 'real',
            p_description: `Withdrawal to ${phone}`
        })

        if (debitError) {
            return NextResponse.json({ error: debitError.message || 'Insufficient funds' }, { status: 400 })
        }

        // 3. Generate Manual Withdrawal IDs
        const conversationId = `MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        const originatorConversationId = `ORIG-${conversationId}`

        // 4. Record pending withdrawal (using Admin client to bypass RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        try {
            const { error: insertError } = await supabaseAdmin.from('mpesa_withdrawals').insert({
                conversation_id: conversationId,
                originator_conversation_id: originatorConversationId,
                user_id: user.id,
                amount: withdrawalAmount,
                phone: phone,
                status: 'pending'
            })
            if (insertError) {
                console.error('[Insert mpesa_withdrawals error]', insertError)
                await supabase.rpc('credit_wallet', {
                    p_user_id: user.id,
                    p_amount: withdrawalAmount,
                    p_mode: 'real',
                    p_description: `Refund: Internal system error recording withdrawal`
                })
                return NextResponse.json({ error: 'Failed to record withdrawal request. Balance refunded.' }, { status: 500 })
            }
        } catch (err: any) {
            console.error('[Insert mpesa_withdrawals exception]', err)
            await supabase.rpc('credit_wallet', {
                p_user_id: user.id,
                p_amount: withdrawalAmount,
                p_mode: 'real',
                p_description: `Refund: Internal system error recording withdrawal`
            })
            return NextResponse.json({ error: 'Failed to record withdrawal request. Balance refunded.' }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Withdrawal request received. Your funds will be sent to you within 24 hours.',
            newBalance 
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
