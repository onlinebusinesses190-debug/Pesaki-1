'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { TradingChart } from '@/components/fx/TradingChart'
import { ArrowUp, ArrowDown, Activity, RefreshCw } from 'lucide-react'
import { apiRequest } from '@/utils/api'
import { useSearchParams } from 'next/navigation'
import { useAuthGuard } from '@/utils/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Helper to generate initial chart data (remains mock for visual history)
const generateData = (count: number, basePrice: number) => {
    let price = basePrice;
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < count; i++) {
        const time = now - (count - i) * 60;
        const open = price;
        const close = price + (Math.random() - 0.5) * (basePrice * 0.001);
        const high = Math.max(open, close) + Math.random() * (basePrice * 0.0005);
        const low = Math.min(open, close) - Math.random() * (basePrice * 0.0005);
        data.push({ time, open, high, low, close });
        price = close;
    }
    return data;
}

export default function FXPage() {
    const authReady = useAuthGuard()
    const [data, setData] = useState<any[]>([])
    const [currentPrice, setCurrentPrice] = useState<number | null>(null)

    if (!authReady) {
        return <div className="w-full text-center py-24 text-white">Validating session…</div>
    }
    const [pair, setPair] = useState('EUR/USD')
    const [lotSize, setLotSize] = useState('0.10')
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const searchParams = useSearchParams()
    const mode = searchParams.get('mode') === 'real' ? 'real' : 'demo'

    const fetchPrice = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true)
            const res = await fetch(`${API_URL}/market/price?pair=${pair}`)
            if (!res.ok) throw new Error('API Error')
            const result = await res.json()

            setCurrentPrice(result.price)

            if (isInitial) {
                const initialHistory = generateData(100, result.price)
                setData(initialHistory)
            } else {
                setData(prev => {
                    const last = prev[prev.length - 1]
                    const nextTime = (last.time as number) + 60
                    const newCandle = {
                        time: nextTime,
                        open: last.close,
                        high: Math.max(last.close, result.price),
                        low: Math.min(last.close, result.price),
                        close: result.price
                    }
                    return [...prev.slice(1), newCandle]
                })
            }
        } catch (err) {
            console.error('Fetch error:', err)
        } finally {
            if (isInitial) setLoading(false)
        }
    }, [pair])

    useEffect(() => {
        fetchPrice(true)
        const interval = setInterval(() => fetchPrice(), 10000) // Update every 10s
        return () => clearInterval(interval)
    }, [fetchPrice])

    const handleTrade = async (direction: 'buy' | 'sell') => {
        if (!currentPrice) return
        setLoading(true)

        try {
            const amount = parseFloat(lotSize) * 1000 // Simplified KSh conversion
            const res = await apiRequest('/games/prediction/place', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    mode,
                    market: pair,
                    direction: direction === 'buy' ? 'UP' : 'DOWN',
                    windowMinutes: 5 // Default window
                })
            });

            if (res.success) {
                alert(`✅ ${direction.toUpperCase()} position opened at ${currentPrice.toFixed(4)}\nStake: KSh ${amount.toLocaleString()}`)
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Activity className="text-primary" /> Pesaki FX
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{pair} • Real-time Market Data</p>
                        <span className={`text-xs font-mono font-bold ${currentPrice ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {currentPrice ? currentPrice.toFixed(4) : 'Loading...'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchPrice(true)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        Live
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
                {/* Chart Area */}
                <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden p-4 relative">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/20 backdrop-blur-sm">
                            <Activity className="animate-pulse text-primary" size={48} />
                        </div>
                    ) : (
                        <TradingChart data={data} />
                    )}
                </div>

                {/* Controls Area */}
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6">
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Select Pair</label>
                        <select
                            value={pair}
                            onChange={(e) => setPair(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-white"
                        >
                            <option value="EUR/USD">EUR/USD</option>
                            <option value="GBP/USD">GBP/USD</option>
                            <option value="USD/JPY">USD/JPY</option>
                            <option value="USD/KES">USD/KES</option>
                            <option value="EUR/KES">EUR/KES</option>
                            <option value="GBP/KES">GBP/KES</option>
                            <option value="XAU/USD">XAU/USD</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Lot Size</label>
                        <input
                            type="number"
                            step="0.01"
                            value={lotSize}
                            onChange={(e) => setLotSize(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-white"
                        />
                    </div>

                    <div className="p-4 bg-white/5 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Stake Value:</span>
                            <span className="text-white font-bold">KSh {(parseFloat(lotSize) * 10000).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Mode:</span>
                            <span className={`font-bold ${mode === 'real' ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {mode.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto space-y-3">
                        <button
                            onClick={() => handleTrade('buy')}
                            disabled={loading || !currentPrice}
                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                        >
                            <ArrowUp size={20} />
                            BUY / UP
                        </button>
                        <button
                            onClick={() => handleTrade('sell')}
                            disabled={loading || !currentPrice}
                            className="w-full h-14 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/20 disabled:opacity-50"
                        >
                            <ArrowDown size={20} />
                            SELL / DOWN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
