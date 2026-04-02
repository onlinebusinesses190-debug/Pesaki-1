'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Disc, Sparkles, Loader2 } from 'lucide-react'
import { apiRequest } from '@/utils/api'
import { useSearchParams } from 'next/navigation'
import { ModeToggle } from '@/components/dashboard/ModeToggle'

type SpinPrize = {
    id: number
    name: string
    value: number  // multiplier (0 = loss, 0.5 = half back, 1.0 = break even, etc.)
    weight: number
    color?: string
}

// Colors matched to prize index from the DB ordering
const PRIZE_COLORS = [
    '#ef4444', // Loss - red
    '#f59e0b', // Cherry - amber
    '#10b981', // Lemon - green
    '#3b82f6', // Orange - blue
    '#8b5cf6', // Bell - purple
    '#f97316', // 7x7 - orange
    '#eab308', // Jackpot - yellow
]

export default function MarketSpinPage() {
    const [prizes, setPrizes] = useState<SpinPrize[]>([])
    const [loadingPrizes, setLoadingPrizes] = useState(true)
    const [spinning, setSpinning] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [stake, setStake] = useState('100')
    const [lastWin, setLastWin] = useState<{ name: string; amount: number } | null>(null)
    const searchParams = useSearchParams()
    const mode = (searchParams.get('mode') === 'real' ? 'real' : 'demo') as 'real' | 'demo'

    // Fetch prizes from the server on mount
    useEffect(() => {
        const fetchPrizes = async () => {
            try {
                const data = await apiRequest('/games/spin/prizes')
                if (data.success && data.data) {
                    setPrizes(data.data)
                }
            } catch (err) {
                console.error('Failed to load prizes:', err)
            } finally {
                setLoadingPrizes(false)
            }
        }
        fetchPrizes()
    }, [])

    const spinWheel = async () => {
        if (spinning || prizes.length === 0) return
        setLastWin(null)
        setSpinning(true)

        try {
            const data = await apiRequest('/games/spin/play', {
                method: 'POST',
                body: JSON.stringify({ amount: Number(stake), mode })
            });

            const result = data.data
            const outcomeSegmentIndex: number = result.prizeIndex
            const segmentAngle = 360 / prizes.length
            const targetAngle = 360 - (outcomeSegmentIndex * segmentAngle)
            const fullSpins = 5 * 360
            const finalRotation = rotation + fullSpins + ((targetAngle - (rotation % 360) + 360) % 360)

            setRotation(finalRotation)

            setTimeout(() => {
                setSpinning(false)
                setLastWin({ name: result.prizeName, amount: result.winAmount })
            }, 5000)
        } catch (err: any) {
            alert(err.message || 'Spin failed');
            setSpinning(false);
        }
    }

    // Build conic-gradient dynamically from prizes
    const buildConicGradient = () => {
        if (prizes.length === 0) return 'conic-gradient(#333 0deg 360deg)'
        const segAngle = 360 / prizes.length
        const stops = prizes.map((p, i) => {
            const color = PRIZE_COLORS[i % PRIZE_COLORS.length]
            return `${color} ${segAngle * i}deg ${segAngle * (i + 1)}deg`
        })
        return `conic-gradient(${stops.join(', ')})`
    }

    if (loadingPrizes) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-purple-400" size={40} />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Disc className="text-purple-500" /> Market Spin
            </h1>

            <ModeToggle />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Wheel */}
                <div className="relative flex justify-center items-center py-8">
                    {/* Pointer */}
                    <div className="absolute top-0 z-20 w-0 h-0 border-l-[20px] border-l-transparent border-t-[40px] border-t-white border-r-[20px] border-r-transparent drop-shadow-lg" />

                    <div
                        className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full relative overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.3)] border-4 border-white/20"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: spinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                        }}
                    >
                        <div
                            className="absolute inset-0 w-full h-full rounded-full"
                            style={{ background: buildConicGradient() }}
                        />

                        {prizes.map((prize, i) => {
                            const segAngle = 360 / prizes.length
                            const rotate = segAngle * i + (segAngle / 2)
                            return (
                                <div
                                    key={i}
                                    className="absolute inset-0 flex justify-center pt-8"
                                    style={{ transform: `rotate(${rotate}deg)` }}
                                >
                                    <span className="text-white font-bold text-shadow rotate-180 writing-mode-vertical text-xs md:text-sm tracking-wider drop-shadow-md whitespace-nowrap">
                                        {prize.name}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Center hub */}
                    <div className="absolute w-16 h-16 bg-gradient-to-br from-white to-gray-300 rounded-full shadow-xl flex items-center justify-center z-10">
                        <Disc className="text-purple-600" size={32} />
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-8">
                    <div className="text-center space-y-2">
                        {lastWin !== null && (
                            <div className={`text-2xl font-bold animate-bounce ${lastWin.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {lastWin.amount > 0 ? `YOU WON KSh ${lastWin.amount}! 🎉` : `${lastWin.name} – Try Again!`}
                            </div>
                        )}
                        {!spinning && lastWin === null && (
                            <div className="text-xl font-bold text-white">Ready to Spin?</div>
                        )}
                        {spinning && (
                            <div className="text-xl font-bold text-yellow-500 animate-pulse">Spinning...</div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-muted-foreground">Stake Amount</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['50', '100', '200', '500', '1000'].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setStake(amt)}
                                    className={`py-2 rounded-lg text-sm font-bold border transition-all ${stake === amt
                                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                        : 'bg-white/5 border-transparent hover:bg-white/10'
                                        }`}
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            value={stake}
                            onChange={(e) => setStake(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-center text-xl font-bold"
                        />
                    </div>

                    {/* Prizes legend */}
                    <div className="space-y-1">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Prize Table</div>
                        {prizes.map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PRIZE_COLORS[i % PRIZE_COLORS.length] }} />
                                    <span className="text-zinc-400">{p.name}</span>
                                </div>
                                <span className="text-white font-bold">{p.value === 0 ? 'Loss' : `${p.value}x`}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={spinWheel}
                        disabled={spinning || prizes.length === 0}
                        className="w-full py-4 text-xl font-black rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {spinning ? <Loader2 className="animate-spin" /> : 'SPIN WHEEL'}
                    </button>

                    <div className="text-xs text-center text-muted-foreground">
                        <Sparkles className="inline w-3 h-3 mr-1" />
                        Prizes are multipliers of your stake
                    </div>
                </div>
            </div>
        </div>
    )
}
