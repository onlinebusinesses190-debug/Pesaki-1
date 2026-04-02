'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ShieldCheck, Coins } from 'lucide-react'

export function ModeToggle() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    
    // Default to demo if not explicitly set to real
    const currentMode = searchParams.get('mode') === 'real' ? 'real' : 'demo'

    const handleModeSwitch = (mode: 'real' | 'demo') => {
        if (mode === currentMode) return
        
        const params = new URLSearchParams(searchParams.toString())
        params.set('mode', mode)
        
        // Use scroll: false to prevent jumping to top
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    return (
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
    )
}
