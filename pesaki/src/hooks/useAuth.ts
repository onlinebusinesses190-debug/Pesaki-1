'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        const supabase = createClient()

        const getSession = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (mounted) {
                setUser(user ?? null)
                setLoading(false)
            }
        }

        getSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (mounted) setUser(session?.user ?? null)
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    return { user, loading }
}
