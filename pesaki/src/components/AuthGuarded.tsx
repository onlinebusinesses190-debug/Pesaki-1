'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/utils/auth'

interface AuthGuardedProps {
    children: ReactNode
    loadingMessage?: string
}

export function AuthGuarded({ children, loadingMessage = 'Validating session…' }: AuthGuardedProps) {
    const { ready, hasSession } = useAuthGuard()
    const router = useRouter()
    const [serverHasSession, setServerHasSession] = useState<boolean | null>(null)

    // If client has no session, confirm with server cookies before redirecting
    useEffect(() => {
        let mounted = true
        if (!ready) return

        if (hasSession) {
            setServerHasSession(true)
            return
        }

        // No client session — check server-side cookie session
        ;(async () => {
            try {
                const res = await fetch('/api/auth/session')
                const data = await res.json()
                if (!mounted) return
                if (data.hasSession) {
                    console.info('[AuthGuarded] Server has session; allowing render')
                    setServerHasSession(true)
                    try { localStorage.setItem('pesaki_last_server_check', JSON.stringify({ ts: Date.now(), ok: true })) } catch {}
                } else {
                    console.info('[AuthGuarded] No server session; redirecting to login')
                    setServerHasSession(false)
                    try { localStorage.setItem('pesaki_last_server_check', JSON.stringify({ ts: Date.now(), ok: false })) } catch {}
                    router.replace('/login')
                }
            } catch (err) {
                console.error('[AuthGuarded] server check failed', err)
                if (!mounted) return
                setServerHasSession(false)
                router.replace('/login')
            }
        })()

        return () => { mounted = false }
    }, [ready, hasSession, router])

    if (!ready) {
        return (
            <div className="w-full text-center py-24 text-white">
                {loadingMessage}
            </div>
        )
    }

    // While we're checking server session, show an informative message
    if (!hasSession && serverHasSession === null) {
        return (
            <div className="w-full text-center py-24 text-white">Restoring session…</div>
        )
    }

    if (!hasSession && serverHasSession === false) {
        return (
            <div className="w-full text-center py-24 text-white">Redirecting to login…</div>
        )
    }

    return <>{children}</>
}
