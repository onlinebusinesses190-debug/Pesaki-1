'use client'

import { useState, useEffect } from 'react'
import { createClient as createBrowserClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('') // Phone number
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    // Check for server error in URL params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('error') === 'server_unavailable') {
            setError('Server is currently unavailable. Please try again later.')
        }
    }, [])

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        // Remove spaces and non-digit characters if we were to enforce it strictly.
        // For now, strip whitespaces.
        const input = identifier.replace(/\s+/g, '')
        
        // Basic frontend validation for phone numbers
        if (!/^[+]?[0-9]{9,15}$/.test(input)) {
            setError("Please enter a valid mobile number")
            setLoading(false)
            return
        }

        const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login'
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: input, password }),
        })

        const result = await response.json()

        if (!response.ok || result.error) {
            setError(result.error || 'Authentication failed')
            setLoading(false)
            return
        }

        if (isSignUp) {
            setMessage('Account created! You can now log in.')
            setIsSignUp(false)
            setLoading(false)
            return
        }

        // If server returned a session, populate the browser Supabase client
        try {
            const supabase = createBrowserClient()
            if (result?.session) {
                // supabase.auth.setSession expects tokens; use setSession when available
                // v2: setSession({ access_token, refresh_token })
                if (typeof supabase.auth.setSession === 'function') {
                    await supabase.auth.setSession({
                        access_token: result.session.access_token,
                        refresh_token: result.session.refresh_token,
                    })
                }
            }
        } catch (err) {
            console.warn('Failed to populate client session', err)
        }

        router.push('/dashboard')
        router.refresh()

    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />

            <div className="w-full max-w-md space-y-8 bg-card/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10">

                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">PESAKI</h1>
                    <p className="text-muted-foreground">
                        {isSignUp ? 'Join the platform' : 'Login to start playing'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none text-foreground/80" htmlFor="identifier">
                            Mobile Number
                        </label>
                        <input
                            id="identifier"
                            type="tel"
                            placeholder="e.g. 0712345678"
                            className="flex h-12 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none text-foreground/80" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="flex h-12 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-red-400 bg-red-900/20 rounded-md border border-red-500/20">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="p-3 text-sm text-green-400 bg-green-900/20 rounded-md border border-green-500/20">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 h-12 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Login')}
                    </button>
                </form>

                <div className="text-center text-sm mt-4">
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                        className="text-primary hover:underline hover:text-primary/80"
                    >
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                    </button>
                </div>

                <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 text-[10px] text-muted-foreground text-center">
                        All accounts are secured exclusively via Mobile Number.
                </div>
            </div>
        </div>
    )
}
