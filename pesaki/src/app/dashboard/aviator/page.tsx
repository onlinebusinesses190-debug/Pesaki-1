'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Plane, Coins, AlertCircle, Loader2 } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { apiRequest } from '@/utils/api'
import { useSearchParams } from 'next/navigation'
import { ModeToggle } from '@/components/dashboard/ModeToggle'
import { AuthGuarded } from '@/components/AuthGuarded'
import { AviatorCanvas } from '@/components/aviator/AviatorCanvas'

type GameStatus = 'WAITING' | 'FLYING' | 'CRASHED'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AviatorPage() {
    const [status, setStatus] = useState<GameStatus>('WAITING')
    const [multiplier, setMultiplier] = useState(1.00)
    const [betAmount, setBetAmount] = useState('100')
    const [cashedOut, setCashedOut] = useState(false)
    const [cashOutMultiplier, setCashOutMultiplier] = useState(0)
    const [history, setHistory] = useState<number[]>([])
    const [isBetting, setIsBetting] = useState(false)
    const [waitTime, setWaitTime] = useState(0)
    const searchParams = useSearchParams()
    const mode = (searchParams.get('mode') === 'real' ? 'real' : 'demo') as 'real' | 'demo'

    const socketRef = useRef<Socket | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const multiplierRef = useRef(1.00)

    // Game Logic
    const placeBet = async () => {
        if (status !== 'WAITING' || isBetting) return
        setIsBetting(true)
        try {
            await apiRequest('/games/aviator/bet', {
                method: 'POST',
                body: JSON.stringify({ amount: Number(betAmount), mode })
            });
        } catch (err: any) {
            alert(err.message || 'Failed to place bet');
            setIsBetting(false)
        }
    }

    const handleCashOut = () => {
        if (status !== 'FLYING' || cashedOut || !socketRef.current) return
        socketRef.current.emit('CASHOUT');
    }

    // Add a state for particles to create a beautiful trail
    const [particles, setParticles] = useState<{ x: number, y: number, life: number }[]>([])

    // Legacy Canvas Drawing removed in favor of AviatorCanvas component

    useEffect(() => {
        const supabase = createClient();
        
        const initGame = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const socket = io(`${API_URL}/aviator`, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                auth: { token: session.access_token }
            });

            // Debug Logs
            socket.on('connect', () => {
              console.log('✅ Aviator socket connected:', socket.id)
            })

            socket.on('connect_error', (err) => {
              console.error('❌ Aviator socket error:', err.message)
            })

            socket.on('disconnect', (reason) => {
              console.warn('⚠️ Aviator socket disconnected:', reason)
            })

            socketRef.current = socket;

            socket.on('ROUND_WAITING', (data) => {
                setStatus('WAITING');
                setMultiplier(1.00);
                multiplierRef.current = 1.00;
                setWaitTime(data.waitTime / 1000);
                setCashedOut(false);
                setIsBetting(false);
            });

            socket.on('ROUND_START', (data) => {
                console.log('🎮 ROUND_START received:', data)
                setStatus('FLYING');
                setWaitTime(0);
            });

            socket.on('MULTIPLIER_TICK', (data) => {
                console.log('📈 MULTIPLIER_TICK:', data.multiplier)
                const newMult = parseFloat(data.multiplier);
                setMultiplier(newMult);
                multiplierRef.current = newMult;
            });

            socket.on('ROUND_CRASHED', (data) => {
                console.log('💥 ROUND_CRASHED at:', data.multiplier)
                setStatus('CRASHED');
                const finalMult = parseFloat(data.multiplier);
                setMultiplier(finalMult);
                multiplierRef.current = finalMult;
                setHistory(prev => [finalMult, ...prev.slice(0, 19)]);
            });

            socket.on('CASHED_OUT', (data) => {
                setCashedOut(true);
                setCashOutMultiplier(data.multiplier);
            });

            socket.on('error', (err) => console.error('Socket error:', err));
        }

        initGame();

        return () => {
            socketRef.current?.disconnect();
        }
    }, [])

    return (
        <AuthGuarded>
            <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Plane className={`text-red-500 ${status === 'FLYING' ? 'animate-pulse' : ''}`} /> AviMarket
                </h1>
            </div>

            <ModeToggle />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 h-[500px] relative">
                    <AviatorCanvas 
                        multiplier={multiplier} 
                        gameState={status} 
                        roundHistory={history} 
                    />
                    
                    <AnimatePresence>
                        {cashedOut && (
                            <motion.div 
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute top-[20%] left-1/2 -translate-x-1/2 bg-green-500 text-black px-8 py-3 rounded-2xl font-black text-2xl shadow-[0_0_40px_rgba(34,197,94,0.6)] z-50 pointer-events-none"
                            >
                                WON: KSh {(parseFloat(betAmount) * cashOutMultiplier).toFixed(2)}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6">
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                        <div className="text-muted-foreground text-sm uppercase mb-1">
                            {status === 'WAITING' ? 'Next Round In' : 'Round Progress'}
                        </div>
                        <div className="text-xl font-bold text-white">
                            {status === 'WAITING' ? `${waitTime}s` : status}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Bet Amount</label>
                        <div className="flex gap-2">
                            <button onClick={() => setBetAmount(String(Math.max(10, parseInt(betAmount) - 10)))} className="p-2 border border-white/10 rounded-lg hover:bg-white/5">-</button>
                            <input
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg text-center font-bold"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                            />
                            <button onClick={() => setBetAmount(String(parseInt(betAmount) + 10))} className="p-2 border border-white/10 rounded-lg hover:bg-white/5">+</button>
                        </div>
                    </div>

                    <div className="mt-auto">
                        {status === 'FLYING' && !cashedOut && isBetting ? (
                            <button
                                onClick={handleCashOut}
                                className="w-full h-20 bg-orange-500 hover:bg-orange-400 text-black font-black text-2xl rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all active:scale-95 flex flex-col items-center justify-center p-1"
                            >
                                <span>CASH OUT</span>
                                <span className="text-sm font-medium opacity-80">
                                    {(parseFloat(betAmount) * multiplier).toFixed(0)} KSh
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={placeBet}
                                disabled={status !== 'WAITING' || isBetting}
                                className="w-full h-20 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-2xl rounded-xl shadow-[0_0_30px_rgba(22,163,74,0.4)] transition-all active:scale-95 border-b-4 border-green-800 flex items-center justify-center gap-2"
                            >
                                {isBetting ? <Loader2 className="animate-spin" /> : 'BET'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </AuthGuarded>
    )
}
