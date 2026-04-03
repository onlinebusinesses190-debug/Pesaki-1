import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json({ hasSession: false }, { status: 200 })
    }

    return NextResponse.json({ hasSession: !!session?.access_token, user: session?.user ? { id: session.user.id, email: session.user.email } : null }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ hasSession: false }, { status: 500 })
  }
}
