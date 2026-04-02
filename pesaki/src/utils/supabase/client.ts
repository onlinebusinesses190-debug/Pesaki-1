import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

export function createClient() {
    if (typeof window === 'undefined') {
        // Avoid invoking browser client during server-side prerender/build.
        throw new Error('Supabase client must be created in the browser')
    }

    if (!supabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
        }

        supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)
    }

    return supabase
}
