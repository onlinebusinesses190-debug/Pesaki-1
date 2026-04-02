import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    const body = await request.json()
    const { identifier, password } = body

    if (!identifier || !password) {
        return NextResponse.json({ error: 'identifier and password are required' }, { status: 400 })
    }

    const normalizedPhone = identifier.replace(/\s+/g, '')
    const email = `${normalizedPhone}@pesaki.com`

    try {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }

        return NextResponse.json({ user: data.user, session: data.session })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 })
    }
}
