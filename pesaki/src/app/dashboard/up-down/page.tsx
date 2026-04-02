'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, Clock, Trophy, History, Loader2 } from 'lucide-react'
import { apiRequest } from '@/utils/api'
import { useSearchParams } from 'next/navigation'
import { ModeToggle } from '@/components/dashboard/ModeToggle'
import { useAuthGuard } from '@/utils/auth'

type GameState = 'OPEN' | 'LOCKED' | 'RESULT'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function UpDownGame() {
    const authReady = useAuthGuard()
    const [gameState, setGameState] = useState<GameState>('OPEN')
    const [timeLeft, setTimeLeft] = useState(300) 

    if (!authReady) {
        return <div className="w-full text-center py-24 text-white">Validating session…</div>
    }
    const [price, setPrice] = useState(1.0850)
    const [startPrice, setStartPrice] = useState(1.0850)
    const [selectedDirection, setSelectedDirection] = useState<'UP' | 'DOWN' | null>(null)
    const [stake, setStake] = useState('100')
    const [history, setHistory] = useState<{ result: 'UP' | 'DOWN', time: string, price: number }[]>([])
    const searchParams = useSearchParams()
    const mode = (searchParams.get('mode') === 'real' ? 'real' : 'demo') as 'real' | 'demo'
    const [isBetting, setIsBetting] = useState(false)

    // Fetch Price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch(`${API_URL}/market/price?pair=EUR/USD`);
                const data = await res.json();
                if (data.price) {
                    setPrice(data.price);
                }
            } catch (e) {
                console.error('Price fetch failed');
            }
        };

        const interval = setInterval(fetchPrice, 5000);
        fetchPrice();
        return () => clearInterval(interval);
    }, []);

    // Game Loop Timer (UI Only)
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) return 300;
                return prev - 1;
            });
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const handleBet = async (direction: 'UP' | 'DOWN') => {
        if (gameState !== 'OPEN' || isBetting) return
        setIsBetting(true);
        try {
            await apiRequest('/games/prediction/place', {
                method: 'POST',
                body: JSON.stringify({
                    amount: Number(stake),
                    mode,
                    market: 'EUR/USD',
                    direction,
                    windowMinutes: 5
                })
            });
            setSelectedDirection(direction)
        } catch (err: any) {
            if (err.message?.includes('Authentication required')) {
                alert('Please login first to place a demo prediction.');
                return;
            }
            alert(err.message || 'Failed to place prediction');
        } finally {
            setIsBetting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <TrendingIcons /> Up & Down
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Predict the market direction in 5 minutes</p>
                </div>

                <div className="flex items-center gap-4 bg-card/50 p-3 rounded-xl border border-white/5">
                    <ModeToggle />
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col items-center px-4">
                        <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Timer</span>
                        <span className={`text-2xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Game Area */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Price Display */}
                    <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-20" />
                        <h3 className="text-muted-foreground uppercase text-sm font-medium mb-2">EUR/USD Price</h3>
                        <div className="text-6xl font-black text-white tracking-tighter flex items-center gap-2">
                            {price.toFixed(4)}
                            {price > startPrice ? (
                                <ArrowUp className="text-emerald-500" size={32} />
                            ) : (
                                <ArrowDown className="text-red-500" size={32} />
                            )}
                        </div>
                        <div className="mt-4 text-xs font-mono text-muted-foreground uppercase tracking-widest opacity-50">Live Market Feed</div>
                    </div>

                    {/* Betting Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleBet('UP')}
                            disabled={gameState !== 'OPEN' || isBetting}
                            className={`h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${selectedDirection === 'UP'
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                                : 'bg-card border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-muted-foreground hover:text-emerald-400'
                                } ${gameState !== 'OPEN' || isBetting ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            {isBetting && selectedDirection === 'UP' ? <Loader2 className="animate-spin" /> : <ArrowUp size={48} strokeWidth={3} />}
                            <span className="text-2xl font-bold">UP</span>
                            {selectedDirection === 'UP' && <span className="text-xs bg-emerald-500 text-black px-2 py-0.5 rounded-full font-bold">SELECTED</span>}
                        </button>

                        <button
                            onClick={() => handleBet('DOWN')}
                            disabled={gameState !== 'OPEN' || isBetting}
                            className={`h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${selectedDirection === 'DOWN'
                                ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                                : 'bg-card border-border hover:border-red-500/50 hover:bg-red-500/5 text-muted-foreground hover:text-red-400'
                                } ${gameState !== 'OPEN' || isBetting ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            {isBetting && selectedDirection === 'DOWN' ? <Loader2 className="animate-spin" /> : <ArrowDown size={48} strokeWidth={3} />}
                            <span className="text-2xl font-bold">DOWN</span>
                            {selectedDirection === 'DOWN' && <span className="text-xs bg-red-500 text-black px-2 py-0.5 rounded-full font-bold">SELECTED</span>}
                        </button>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-medium text-muted-foreground">Stake Amount</label>
                            <span className="text-sm font-bold text-white">Min: KSh 10</span>
                        </div>
                        <div className="flex gap-2">
                            {['100', '500', '1000', '5000'].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setStake(amt)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${stake === amt
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-transparent border-white/10 text-muted-foreground hover:border-white/30'
                                        }`}
                                >
                                    {amt}
                                </button>
                            ))}
                            <input
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(e.target.value)}
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-primary text-right font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar / History */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6">
                            <History className="text-accent" /> Recent Results
                        </h3>

                        <div className="space-y-3">
                            {history.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">No recent games</div>
                            )}
                            {history.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${item.result === 'UP' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {item.result === 'UP' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-white">Closed @ {item.price.toFixed(2)}</span>
                                            <span className="text-xs text-muted-foreground">{item.time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/50 to-violet-900/50 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-2">
                                <Trophy className="text-yellow-400" /> Winning Rules
                            </h3>
                            <ul className="text-sm text-indigo-200 space-y-2 mt-4">
                                <li className="flex gap-2">• <span>Majority Choice: <b className="text-white">LOSE 100%</b></span></li>
                                <li className="flex gap-2">• <span>Minority Choice: <b className="text-white">WIN +50%</b></span></li>
                            </ul>
                            <p className="text-xs text-indigo-300/60 mt-4 italic">
                                *Pesaki earns from the imbalance.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function TrendingIcons() {
    return <ArrowUp className="text-emerald-500" />
}
