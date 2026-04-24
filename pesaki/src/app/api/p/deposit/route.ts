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
        throw new Error('Missing Daraja Consumer Key or Secret in .env.local')
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: { Authorization: `Basic ${credentials}` },
        cache: 'no-store',
    })
    
    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Failed to fetch Daraja token: ${errText}`)
    }
    
    const data = await res.json()
    if (!data.access_token) {
        throw new Error(`Token response missing access_token: ${JSON.stringify(data)}`)
    }
    return data.access_token
}

export async function POST(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only accept amount from client — phone is pulled from profile
        const { amount } = await request.json()

        if (!amount || Number(amount) < 10) {
            return NextResponse.json({ error: 'Minimum deposit is KSh 10' }, { status: 400 })
        }

        // Fetch the user's registered phone number from their profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', user.id)
            .single()

        if (profileError || !profile?.phone) {
            return NextResponse.json({ 
                error: 'No phone number found on your account. Please contact support.' 
            }, { status: 400 })
        }

        // Normalize phone number to 254XXXXXXXXX format (handles 07XX, +254, 254 prefixes)
        let normalizedPhone = String(profile.phone).replace(/\s+/g, '').replace(/[^0-9+]/g, '')
        if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '254' + normalizedPhone.slice(1)
        } else if (normalizedPhone.startsWith('+')) {
            normalizedPhone = normalizedPhone.slice(1)
        }

        if (!normalizedPhone.startsWith('254') || normalizedPhone.length !== 12) {
            return NextResponse.json({ 
                error: `Invalid phone number format on your account: ${profile.phone}` 
            }, { status: 400 })
        }

        const shortcode = process.env.DARAJA_SHORTCODE!
        const passkey = process.env.DARAJA_PASSKEY!
        const callbackUrl = process.env.DARAJA_CALLBACK_URL!

        // Generate timestamp in EAT (UTC+3) as required by Safaricom
        const now = new Date()
        const eatOffset = 3 * 60 * 60 * 1000 // 3 hours in ms
        const eatDate = new Date(now.getTime() + eatOffset)
        
        const timestamp = eatDate.getFullYear().toString()
            + String(eatDate.getMonth() + 1).padStart(2, '0')
            + String(eatDate.getDate()).padStart(2, '0')
            + String(eatDate.getHours()).padStart(2, '0')
            + String(eatDate.getMinutes()).padStart(2, '0')
            + String(eatDate.getSeconds()).padStart(2, '0')

        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
        const accessToken = await getDarajaToken()

        // Create a more unique AccountReference to avoid 'unresolved' system failures
        const accountRef = `PESAKI-${user.id.slice(0, 5).toUpperCase()}`

        const payload = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.floor(Number(amount)), // Ensure integer
            PartyA: normalizedPhone,
            PartyB: shortcode,
            PhoneNumber: normalizedPhone,
            CallBackURL: callbackUrl,
            AccountReference: accountRef,
            TransactionDesc: 'Wallet Deposit',
        }

        const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const data = await res.json()

        // Log the Daraja response for diagnostics
        console.info('[STK Push Response]', { responseStatus: res.status, body: data, phone: normalizedPhone, amount: Number(amount) })

        if (!res.ok || data.ResponseCode !== '0') {
            console.error('[STK Push Error]', data)
            return NextResponse.json({
                error: data.errorMessage || data.CustomerMessage || 'STK Push failed',
                detail: data,
            }, { status: 400 })
        }

        // Record the pending deposit linked to this user (using Admin client to bypass RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error: insertError } = await supabaseAdmin.from('mpesa_deposits').insert({
            checkout_request_id: data.CheckoutRequestID,
            user_id: user.id,
            amount: Number(amount),
            phone: normalizedPhone,
            status: 'pending'
        })

        if (insertError) {
            console.error('[STK Push DB Insert Error]', insertError)
            return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
        }

        // Log the recorded pending deposit for easier tracing
        console.info('[STK Push Recorded]', { CheckoutRequestID: data.CheckoutRequestID, phone: normalizedPhone, amount: Number(amount) })

        return NextResponse.json({
            success: true,
            phone: normalizedPhone, // Can display masked number to user for confirmation
            CheckoutRequestID: data.CheckoutRequestID,
            CustomerMessage: data.CustomerMessage,
        })
    } catch (err: any) {
        console.error('[STK Push Exception]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
