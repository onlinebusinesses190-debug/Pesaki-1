import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function normalizePhone(raw: string): Promise<string> {
    const digits = String(raw).replace(/\s+/g, '').replace(/[^0-9]/g, '')
    if (digits.startsWith('0')) return '254' + digits.slice(1)
    if (digits.startsWith('7') || digits.startsWith('1')) return '254' + digits
    if (digits.startsWith('+254')) return digits.slice(1)
    if (digits.startsWith('254')) return digits
    return digits
}

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
        const rawPhone = String(get('PhoneNumber'))

        if (!amount || !rawPhone) {
            console.error('[M-Pesa Callback] Missing amount or phone number in callback')
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        const phoneNumber = await normalizePhone(rawPhone)

        // Look up the user's profile by phone number, then find their wallet
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, phone, referred_by')
            .eq('phone', phoneNumber)
            .maybeSingle()

        if (profileError || !profile) {
            console.error('[M-Pesa Callback] Profile not found for phone:', phoneNumber, profileError)
            // Still return 200 to Safaricom so they don't keep retrying
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('wallets')
            .select('id, balance, user_id')
            .eq('user_id', profile.id)
            .single()

        if (walletError || !wallet) {
            console.error('[M-Pesa Callback] Wallet not found for user:', profile.id, walletError)
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        // Credit the wallet
        const newBalance = Number(wallet.balance) + amount

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

        console.log(`[M-Pesa Callback] Credited KSh ${amount} to wallet ${wallet.id}. New balance: ${newBalance}`)

        // --- Referral bonus ---
        // If the depositing user was referred by someone, credit a bonus to the referrer
        if (profile.referred_by) {
            const referralBonus = Math.min(amount * 0.1, 500) // 10% of deposit, capped at KSh 500
            try {
                const { data: referrerWallet, error: refWalletError } = await supabaseAdmin
                    .from('wallets')
                    .select('id, balance, user_id')
                    .eq('user_id', profile.referred_by)
                    .maybeSingle()

                if (!refWalletError && referrerWallet) {
                    const refNewBalance = Number(referrerWallet.balance) + referralBonus

                    await supabaseAdmin
                        .from('wallets')
                        .update({ balance: refNewBalance })
                        .eq('id', referrerWallet.id)

                    await supabaseAdmin.from('transactions').insert({
                        wallet_id: referrerWallet.id,
                        type: 'win',
                        amount: referralBonus,
                        is_demo: false,
                        game_type: 'referral',
                        metadata: { referrer_bonus: true, referred_user: profile.id, source_deposit: amount },
                    })

                    try {
                        await supabaseAdmin.from('referrals').insert({
                            referrer_id: profile.referred_by,
                            referred_id: profile.id,
                            deposit_amount: amount,
                            bonus_amount: referralBonus,
                        })
                    } catch (refInsertErr) {
                        // tolerate if referrals table not yet created
                        console.debug('[M-Pesa Callback] Referral record insert skipped:', refInsertErr)
                    }

                    console.log(`[M-Pesa Callback] Credited KSh ${referralBonus} referral bonus to referrer ${profile.referred_by}. New balance: ${refNewBalance}`)
                }
            } catch (refErr) {
                console.error('[M-Pesa Callback] Referral bonus credit failed:', refErr)
                // Don't fail the main deposit if referral bonus fails
            }
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    } catch (err) {
        console.error('[M-Pesa Callback Exception]', err)
        // Always return 200 to Safaricom
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }
}
