import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const BASE_URL = process.env.DARAJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

async function getDarajaToken(): Promise<string> {
    const consumerKey = (process.env.DARAJA_CONSUMER_KEY || '').trim()
    const consumerSecret = (process.env.DARAJA_CONSUMER_SECRET || '').trim()
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: { Authorization: `Basic ${credentials}` },
        cache: 'no-store',
    })
    
    if (!res.ok) throw new Error('Failed to fetch Daraja token')
    const data = await res.json()
    return data.access_token
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
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

        // 3. Initiate Daraja B2C Request
        const accessToken = await getDarajaToken()
        const b2cShortcode = process.env.DARAJA_B2C_SHORTCODE || process.env.DARAJA_SHORTCODE;
        
        const b2cPayload = {
            InitiatorName: process.env.DARAJA_B2C_INITIATOR_NAME || 'testapi',
            SecurityCredential: process.env.DARAJA_B2C_SECURITY_CREDENTIAL,
            CommandID: 'BusinessPayment',
            Amount: Math.floor(withdrawalAmount),
            PartyA: b2cShortcode,
            PartyB: phone,
            Remarks: 'Pesaki Withdrawal',
            QueueTimeOutURL: process.env.DARAJA_B2C_CALLBACK_URL,
            ResultURL: process.env.DARAJA_B2C_CALLBACK_URL,
            Occasion: 'Wallet Withdrawal'
        }

        const mpesaRes = await fetch(`${BASE_URL}/mpesa/b2c/v1/paymentrequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(b2cPayload),
        })

        const mpesaData = await mpesaRes.json()

        if (!mpesaRes.ok || mpesaData.ResponseCode !== '0') {
            // CRITICAL: If B2C request fails immediately, refund the user
            await supabase.rpc('credit_wallet', {
                p_user_id: user.id,
                p_amount: withdrawalAmount,
                p_mode: 'real',
                p_description: 'Refund: Withdrawal Request Failed'
            })
            
            return NextResponse.json({ 
                error: mpesaData.ResponseDescription || 'M-Pesa B2C request failed' 
            }, { status: 500 })
        }

        // 4. Record pending withdrawal
        await supabase.from('mpesa_withdrawals').insert({
            conversation_id: mpesaData.ConversationID,
            originator_conversation_id: mpesaData.OriginatorConversationID,
            user_id: user.id,
            amount: withdrawalAmount,
            phone: phone,
            status: 'pending'
        })

        return NextResponse.json({ 
            success: true, 
            message: 'Withdrawal initiated successfully. You will receive an SMS shortly.',
            newBalance 
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
