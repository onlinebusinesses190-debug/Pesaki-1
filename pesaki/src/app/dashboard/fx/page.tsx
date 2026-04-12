'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { TradingChart } from '@/components/fx/TradingChart'
import { Activity, RefreshCw } from 'lucide-react'
import { apiRequest } from '@/utils/api'
import { useSearchParams } from 'next/navigation'
import { AuthGuarded } from '@/components/AuthGuarded'

const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined' && window.location.hostname) {
        return `http://${window.location.hostname}:4000`;
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};
const API_URL = getApiUrl();

const LOT_SIZES = [0.01, 0.05, 0.1, 0.5, 1];
const DURATIONS = [
    { label: '5s', val: 5 / 60 },
    { label: '10s', val: 10 / 60 },
    { label: '1m', val: 1 },
    { label: '5m', val: 5 },
    { label: '24h', val: 1440 }
];
const STAKES = [100, 200, 500, 1000, 2000, 5000];

// Helper to generate initial chart data
const generateData = (count: number, basePrice: number) => {
    let price = basePrice;
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < count; i++) {
        const time = now - (count - i) * 1;
        const open = price;
        const close = price + (Math.random() - 0.5) * (basePrice * 0.0001);
        const high = Math.max(open, close) + Math.random() * (basePrice * 0.00005);
        const low = Math.min(open, close) - Math.random() * (basePrice * 0.00005);
        data.push({ time, open, high, low, close });
        price = close;
    }
    return data;
}

export default function FXPage() {
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode') === 'real' ? 'real' : 'demo'
    
    const [data, setData] = useState<any[]>([])
    const [currentPrice, setCurrentPrice] = useState<number | null>(null)
    const [pair, setPair] = useState('USD/KES')
    
    const [lotSize, setLotSize] = useState<number>(0.01)
    const [duration, setDuration] = useState<{label: string, val: number}>(DURATIONS[1]) // 10s
    const [stake, setStake] = useState<number>(100)
    
    const [loading, setLoading] = useState(false)
    const [tradeError, setTradeError] = useState<string | null>(null)
    const [openPositions, setOpenPositions] = useState<any[]>([])

    // Prices calculation
    const spread = currentPrice && currentPrice > 50 ? 0.10 : 0.0002;
    const ask = currentPrice ? currentPrice + (spread / 2) : 0;
    const bid = currentPrice ? currentPrice - (spread / 2) : 0;

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
                    const nextTime = (last.time as number) + 1
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

    const fetchOpenPositions = useCallback(async () => {
        try {
            const res = await apiRequest('/games/prediction/pending', { method: 'GET' });
            if (res.success && res.data) {
                setOpenPositions(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch positions', err);
        }
    }, []);

    useEffect(() => {
        fetchPrice(true)
        fetchOpenPositions()
        
        // 1s update interval for continuous ticking
        const priceInterval = setInterval(() => fetchPrice(), 1000)
        const posInterval = setInterval(() => fetchOpenPositions(), 5000) 
        
        return () => {
            clearInterval(priceInterval)
            clearInterval(posInterval)
        }
    }, [fetchPrice, fetchOpenPositions])

    const handleTrade = async (direction: 'buy' | 'sell') => {
        if (!currentPrice) return
        setLoading(true)
        setTradeError(null)

        try {
            const res = await apiRequest('/games/prediction/place', {
                method: 'POST',
                body: JSON.stringify({
                    amount: stake,
                    mode,
                    market: pair,
                    direction: direction === 'buy' ? 'UP' : 'DOWN',
                    windowMinutes: duration.val
                })
            });

            if (res.success) {
                fetchOpenPositions();
            } else {
                setTradeError(res.error || 'Failed to place trade');
            }
        } catch (err: any) {
            setTradeError(err.message || 'An error occurred');
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthGuarded>
            <div className="space-y-4 max-w-5xl mx-auto pb-20 lg:pb-6">
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h1 className="text-xl lg:text-3xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-primary w-5 h-5 lg:w-8 lg:h-8" /> Pesaki FX
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <select
                                value={pair}
                                onChange={(e) => setPair(e.target.value)}
                                className="bg-transparent border-none text-sm text-muted-foreground focus:ring-0 p-0 cursor-pointer"
                            >
                                <option value="EUR/USD">EUR/USD</option>
                                <option value="GBP/USD">GBP/USD</option>
                                <option value="USD/JPY">USD/JPY</option>
                                <option value="USD/KES">USD/KES</option>
                                <option value="EUR/KES">EUR/KES</option>
                                <option value="GBP/KES">GBP/KES</option>
                                <option value="XAU/USD">XAU/USD</option>
                            </select>
                            <span className="text-muted-foreground text-sm">•</span>
                            <span className={`text-xs font-mono font-bold ${currentPrice ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                {currentPrice ? currentPrice.toFixed(currentPrice > 50 ? 2 : 4) : 'Loading...'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchPrice(true)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground mr-1"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 text-xs font-semibold tracking-wide">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Chart Area */}
                    <div className="flex-1 bg-[#151924] border border-[#2b313f] rounded-xl overflow-hidden p-2 lg:p-4 min-h-[350px] lg:min-h-[500px]">
                        {loading && !currentPrice ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Activity className="animate-pulse text-primary" size={32} />
                            </div>
                        ) : (
                            <TradingChart data={data} colors={{ backgroundColor: '#151924' }} />
                        )}
                    </div>

                    {/* Controls Area (Right side on desktop, bottom on mobile) */}
                    <div className="w-full lg:w-[380px] shrink-0 bg-[#0b0e14] border border-[#1e2330] rounded-xl p-4 flex flex-col gap-5">
                        
                        {/* Lot Size */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">Lot Size</label>
                            <div className="flex gap-2 w-full">
                                {LOT_SIZES.map(v => (
                                    <button 
                                        key={v}
                                        onClick={() => setLotSize(v)}
                                        className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${lotSize === v ? 'bg-[#dcb13c] text-black' : 'bg-[#181d29] text-gray-400 hover:bg-[#202636]'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">Duration</label>
                            <div className="flex gap-2 w-full">
                                {DURATIONS.map(d => (
                                    <button 
                                        key={d.label}
                                        onClick={() => setDuration(d)}
                                        className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${duration.label === d.label ? 'bg-[#dcb13c] text-black' : 'bg-[#181d29] text-gray-400 hover:bg-[#202636]'}`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stake */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">Stake (KES)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {STAKES.map(v => (
                                    <button 
                                        key={v}
                                        onClick={() => setStake(v)}
                                        className={`py-2 rounded text-sm font-medium transition-colors ${stake === v ? 'bg-[#dcb13c] text-black' : 'bg-[#181d29] text-gray-400 hover:bg-[#202636]'}`}
                                    >
                                        {v.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ask / Spread / Bid Display */}
                        <div className="flex justify-between items-center text-sm font-mono mt-2 px-2">
                            <div className="text-gray-400">Ask: <span className="text-gray-200">{ask.toFixed(currentPrice && currentPrice > 50 ? 2 : 4)}</span></div>
                            <div className="text-gray-500 text-xs">Spread: {spread.toFixed(currentPrice && currentPrice > 50 ? 2 : 4)}</div>
                            <div className="text-gray-400">Bid: <span className="text-gray-200">{bid.toFixed(currentPrice && currentPrice > 50 ? 2 : 4)}</span></div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleTrade('buy')}
                                disabled={loading || !currentPrice}
                                className="flex-1 py-4 bg-[#236e40] hover:bg-[#28814a] text-white font-bold rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <span className="uppercase tracking-wider text-sm mb-1">Buy</span>
                                <span className="font-mono opacity-80 font-normal">{ask.toFixed(currentPrice && currentPrice > 50 ? 2 : 4)}</span>
                            </button>
                            <button
                                onClick={() => handleTrade('sell')}
                                disabled={loading || !currentPrice}
                                className="flex-1 py-4 bg-[#6e2525] hover:bg-[#852c2c] text-white font-bold rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <span className="uppercase tracking-wider text-sm mb-1">Sell</span>
                                <span className="font-mono opacity-80 font-normal">{bid.toFixed(currentPrice && currentPrice > 50 ? 2 : 4)}</span>
                            </button>
                        </div>

                        {/* Error Validation */}
                        {tradeError && (
                            <div className="text-center text-red-500 text-sm font-medium mt-[-4px]">
                                {tradeError}
                            </div>
                        )}

                        {/* Footer Status */}
                        <div className="text-center text-xs text-gray-500 mt-2">
                            Mode: <span className="text-gray-300 font-medium capitalize">{mode}</span> &bull; Timer: <span className="text-[#dcb13c] font-medium">{duration.label}</span>
                        </div>
                    </div>
                </div>

                {/* Open Positions Card */}
                <div className="bg-[#0b0e14] border border-[#1e2330] rounded-xl p-4 flex flex-col gap-3">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">Open Positions ({openPositions.length})</h2>
                    
                    <div className="flex flex-col gap-2">
                        {openPositions.length === 0 ? (
                            <p className="text-sm text-gray-600 text-center py-4">No open positions.</p>
                        ) : (
                            openPositions.map((pos) => {
                                const isBuy = pos.direction === 'up' || pos.direction === 'UP';
                                const profitMock = (Math.random() - 0.5) * pos.amount * 0.1; // Simple visual mock until settled, in a real app this uses active price
                                const profitColor = profitMock >= 0 ? 'text-emerald-500' : 'text-red-500';
                                
                                return (
                                    <div key={pos.id} className="flex items-center justify-between p-3 bg-[#131720] rounded-lg border border-[#1e2330]">
                                        <div className="flex items-center gap-3">
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-[#236e40] text-emerald-100' : 'bg-[#6e2525] text-red-100'} uppercase`}>
                                                {isBuy ? 'Buy' : 'Sell'}
                                            </div>
                                            <div className="font-semibold text-sm text-gray-200">{pos.market}</div>
                                            <div className="text-xs text-gray-500">&times;{pos.amount / 10000} {/* Using lot mock logic */}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-xs text-gray-400">
                                                {Math.ceil((new Date(pos.window_close_at).getTime() - Date.now()) / 1000)}s
                                            </div>
                                            <div className={`text-sm font-mono font-medium ${profitColor}`}>
                                                {profitMock > 0 ? '+' : ''}{profitMock.toFixed(2)} KES
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </AuthGuarded>
    )
}
