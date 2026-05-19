'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ShieldCheck, Coins, Wallet } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export function ModeToggle() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    
    // Default to demo if not explicitly set to real
    const currentMode = searchParams.get('mode') === 'real' ? 'real' : 'demo'

    const [balances, setBalances] = useState<{ real: number, demo: number } | null>(null)

    useEffect(() => {
        const fetchBalance = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance, demo_balance')
                .eq('user_id', user.id)
                .single()

            if (wallet) {
                setBalances({
                    real: Number(wallet.balance),
                    demo: Number(wallet.demo_balance)
                })
            }
        }
        fetchBalance()

        // Also refresh balance occasionally
        const interval = setInterval(fetchBalance, 5000)
        return () => clearInterval(interval)
    }, [])

    const handleModeSwitch = (mode: 'real' | 'demo') => {
        if (mode === currentMode) return
        
        const params = new URLSearchParams(searchParams.toString())
        params.set('mode', mode)
        
        // Use scroll: false to prevent jumping to top
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center p-1 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md w-fit shadow-inner">
            <button
                onClick={() => handleModeSwitch('demo')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                    currentMode === 'demo'
                        ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)] border border-blue-500/30'
                        : 'text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
                <ShieldCheck size={18} className={currentMode === 'demo' ? 'animate-pulse' : ''} />
                DEMO
            </button>
            <button
                onClick={() => handleModeSwitch('real')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                    currentMode === 'real'
                        ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-emerald-500/30'
                        : 'text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
                <Coins size={18} className={currentMode === 'real' ? 'animate-pulse' : ''} />
                REAL
            </button>
        </div>
        
        {balances && (
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border border-white/10 rounded-xl backdrop-blur-md">
                <Wallet size={16} className={currentMode === 'real' ? 'text-emerald-400' : 'text-blue-400'} />
                <span className="text-sm font-medium text-zinc-400">Balance:</span>
                <span className={`font-mono font-bold ${currentMode === 'real' ? 'text-white' : 'text-zinc-200'}`}>
                    KES {(currentMode === 'real' ? balances.real : balances.demo).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        )}
        </div>
    )
}
