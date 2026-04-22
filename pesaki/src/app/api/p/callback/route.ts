import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    try {
        // Use service role key for server-side wallet update (bypasses RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const body = await request.json()
        console.log('[M-Pesa Callback Raw]', JSON.stringify(body, null, 2))

        const stkCallback = body?.Body?.stkCallback
        if (!stkCallback) {
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback

        if (ResultCode !== 0) {
            // Payment failed or cancelled by user
            console.log(`[M-Pesa] Payment failed: ${ResultDesc}`)
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        // Extract metadata items
        const items: { Name: string, Value: string | number }[] = CallbackMetadata?.Item || []
        const get = (name: string) => items.find(i => i.Name === name)?.Value

        const amount = Number(get('Amount'))
        const mpesaReceiptNumber = get('MpesaReceiptNumber')
        const phoneNumber = String(get('PhoneNumber'))

        if (!amount || !phoneNumber) {
            console.error('[M-Pesa Callback] Missing amount or phone number in callback')
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        // Look up wallet by phone number
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('wallets')
            .select('id, balance')
            .eq('phone_number', phoneNumber)
            .single()

        if (walletError || !wallet) {
            console.error('[M-Pesa Callback] Wallet not found for phone:', phoneNumber, walletError)
            // Still return 200 to Safaricom so they don't keep retrying
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        // Credit the wallet
        const newBalance = wallet.balance + amount

        const { error: updateError } = await supabaseAdmin
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', wallet.id)

        if (updateError) {
            console.error('[M-Pesa Callback] Failed to update wallet:', updateError)
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        // Log the transaction
        await supabaseAdmin.from('transactions').insert({
            wallet_id: wallet.id,
            type: 'deposit',
            amount,
            is_demo: false,
            game_type: 'mpesa',
            metadata: { mpesa_receipt: mpesaReceiptNumber, phone: phoneNumber },
        })

        console.log(`[M-Pesa Callback] ✅ Credited KSh ${amount} to wallet ${wallet.id}. New balance: ${newBalance}`)

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    } catch (err) {
        console.error('[M-Pesa Callback Exception]', err)
        // Always return 200 to Safaricom
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }
}
