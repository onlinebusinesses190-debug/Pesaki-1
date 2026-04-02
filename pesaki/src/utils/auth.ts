'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from './supabase/client'

export function useAuthGuard(redirectTo = '/login') {
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.access_token) {
          router.replace(redirectTo)
          return
        }
      } catch (error) {
        console.error('Auth guard error', error)
        router.replace(redirectTo)
        return
      } finally {
        if (mounted) setReady(true)
      }
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [router, redirectTo])

  return ready
}
