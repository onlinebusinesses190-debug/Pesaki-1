import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    const body = await request.json()
    const { identifier, password, referral_code } = body

    if (!identifier || !password) {
        return NextResponse.json({ error: 'identifier and password are required' }, { status: 400 })
    }

    const normalizedPhone = identifier.replace(/\s+/g, '')
    const email = `${normalizedPhone}@pesaki.com`

    try {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_identifier: normalizedPhone,
                    auth_type: 'phone',
                },
            },
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // If a referral code was provided, validate it and link the new user to their referrer.
        // The DB trigger auto-generates a referral_code for the new user; here we set referred_by.
        if (referral_code) {
            const supabaseAdmin = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const { data: referrerProfile, error: refLookupError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('referral_code', referral_code)
                .maybeSingle()

            if (refLookupError || !referrerProfile) {
                console.warn(`[Signup] Invalid referral code: ${referral_code}`)
                // Not a hard failure — user still signs up, just no referral linkage
            } else if (referrerProfile.id !== data.user?.id) {
                const { error: refUpdateError } = await supabaseAdmin
                    .from('profiles')
                    .update({ referred_by: referrerProfile.id })
                    .eq('id', data.user!.id)

                if (refUpdateError) {
                    console.error('[Signup] Failed to link referral:', refUpdateError)
                } else {
                    console.log(`[Signup] Linked referral: user ${data.user!.id} referred by ${referrerProfile.id} via code ${referral_code}`)
                }
            }
        }

        return NextResponse.json({ user: data.user })
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Signup failed' }, { status: 500 })
    }
}
