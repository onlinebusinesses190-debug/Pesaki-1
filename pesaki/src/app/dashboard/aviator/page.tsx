'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Plane, Coins, AlertCircle, Loader2 } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { createClient } from '@/utils/supabase/client'
import { apiRequest } from '@/utils/api'
import { useSearchParams } from 'next/navigation'
import { ModeToggle } from '@/components/dashboard/ModeToggle'
import { useAuthGuard } from '@/utils/auth'

type GameStatus = 'WAITING' | 'FLYING' | 'CRASHED'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AviatorPage() {
    const authReady = useAuthGuard()
    const [status, setStatus] = useState<GameStatus>('WAITING')
    const [multiplier, setMultiplier] = useState(1.00)

    if (!authReady) {
        return <div className="w-full text-center py-24 text-white">Validating session…</div>
    }
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

    // Canvas Drawing
    const drawCanvas = (currentMult: number, isCrashed: boolean) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const width = canvas.width
        const height = canvas.height

        // Clear with a slight fade effect for trail persistence if desired, 
        // but for now let's just clear fully and draw our own particles.
        ctx.clearRect(0, 0, width, height)

        // Draw Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.lineWidth = 1
        for (let i = 0; i < width; i += 50) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, height)
            ctx.stroke()
        }
        for (let i = 0; i < height; i += 50) {
            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(width, i)
            ctx.stroke()
        }

        // Calculate Position
        // Path grows exponentially: x starts slow and speeds up, y starts low and goes high
        const progress = Math.min(1, (currentMult - 1) / 10) // Normalize roughly for first 10x
        const px = 50 + (width - 100) * (1 - Math.pow(1 - progress, 2)) // Ease out x
        const py = height - 50 - (height - 100) * Math.pow(progress, 1.5) // Ease in y

        // Draw Flight Path (Curve)
        ctx.beginPath()
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3
        ctx.lineJoin = 'round'
        ctx.moveTo(50, height - 50)
        
        // Use quadratic curve for smoothness
        const cpX = px * 0.5 + 25
        const cpY = height - 50
        ctx.quadraticCurveTo(cpX, cpY, px, py)
        
        // Add a glowing gradient to the line
        const grad = ctx.createLinearGradient(50, height - 50, px, py)
        grad.addColorStop(0, 'rgba(239, 68, 68, 0)')
        grad.addColorStop(1, '#ef4444')
        ctx.strokeStyle = grad
        ctx.stroke()

        // Draw Particles (The Trail)
        if (status === 'FLYING') {
            setParticles(prev => [
                { x: px, y: py, life: 1.0 },
                ...prev.map(p => ({ ...p, life: p.life - 0.05 })).filter(p => p.life > 0)
            ].slice(0, 30))
        }

        particles.forEach(p => {
            ctx.beginPath()
            ctx.fillStyle = `rgba(239, 68, 68, ${p.life * 0.5})`
            ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2)
            ctx.fill()
        })

        // Draw The Plane (Red Arrow Redesign)
        ctx.save()
        ctx.translate(px, py)
        
        // Calculate rotation based on trajectory
        const angle = Math.atan2(py - (height - 50), px - 50)
        ctx.rotate(angle)

        if (isCrashed) {
            ctx.scale(1.2, 1.2)
            ctx.shadowBlur = 20
            ctx.shadowColor = '#ef4444'
        }

        // Sleek Plane Shape
        ctx.beginPath()
        ctx.fillStyle = '#ef4444'
        
        // Body
        ctx.moveTo(15, 0)
        ctx.lineTo(-15, -8)
        ctx.lineTo(-10, 0)
        ctx.lineTo(-15, 8)
        ctx.closePath()
        ctx.fill()

        // Wing
        ctx.beginPath()
        ctx.fillStyle = '#b91c1c' // Darker red for depth
        ctx.moveTo(-5, 0)
        ctx.lineTo(-12, -15)
        ctx.lineTo(-2, -15)
        ctx.lineTo(5, 0)
        ctx.closePath()
        ctx.fill()

        ctx.restore()

        if (isCrashed) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'
            ctx.fillRect(0, 0, width, height)
            
            ctx.fillStyle = 'white'
            ctx.font = '900 48px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText("FLEW AWAY!", width / 2, height / 2)
        }
    }

    useEffect(() => {
        const supabase = createClient();
        
        const initGame = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const socket = io(`${API_URL}/aviator`, {
                auth: { token: session.access_token }
            });

            socketRef.current = socket;

            socket.on('ROUND_WAITING', (data) => {
                setStatus('WAITING');
                setMultiplier(1.00);
                multiplierRef.current = 1.00;
                setWaitTime(data.waitTime / 1000);
                setCashedOut(false);
                setIsBetting(false);
                drawCanvas(1.00, false);
            });

            socket.on('ROUND_START', () => {
                setStatus('FLYING');
                setWaitTime(0);
            });

            socket.on('MULTIPLIER_TICK', (data) => {
                const newMult = parseFloat(data.multiplier);
                setMultiplier(newMult);
                multiplierRef.current = newMult;
                drawCanvas(newMult, false);
            });

            socket.on('ROUND_CRASHED', (data) => {
                setStatus('CRASHED');
                const finalMult = parseFloat(data.multiplier);
                setMultiplier(finalMult);
                multiplierRef.current = finalMult;
                setHistory(prev => [finalMult, ...prev.slice(0, 19)]);
                drawCanvas(finalMult, true);
            });

            socket.on('CASHED_OUT', (data) => {
                setCashedOut(true);
                setCashOutMultiplier(data.multiplier);
            });

            socket.on('error', (err) => console.error('Socket error:', err));
        }

        initGame();

        const canvas = canvasRef.current
        if (canvas) {
            canvas.width = canvas.parentElement?.clientWidth || 800
            canvas.height = 400
        }

        return () => {
            socketRef.current?.disconnect();
        }
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Plane className={`text-red-500 ${status === 'FLYING' ? 'animate-pulse' : ''}`} /> AviMarket
                </h1>
                <div className="flex gap-2 text-sm overflow-x-auto max-w-[500px]">
                    {history.map((m, i) => (
                        <div key={i} className={`px-2 py-1 rounded font-mono font-bold ${m < 2.0 ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                            {m.toFixed(2)}x
                        </div>
                    ))}
                </div>
            </div>

            <ModeToggle />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-card border border-border rounded-2xl relative overflow-hidden h-[500px] flex flex-col">
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className={`text-8xl font-black tracking-tighter transition-all ${status === 'CRASHED' ? 'text-red-600 scale-110' : 'text-white'
                            }`}>
                            {multiplier.toFixed(2)}x
                        </div>
                        {status === 'CRASHED' && (
                            <div className="absolute top-[60%] text-red-500 font-bold text-xl animate-bounce">
                                FLEW AWAY!
                            </div>
                        )}
                        {cashedOut && (
                            <div className="absolute top-[30%] bg-green-500/90 text-black px-6 py-2 rounded-full font-bold text-xl animate-fade-up">
                                You Won: KSh {(parseFloat(betAmount) * cashOutMultiplier).toFixed(2)}
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} className="w-full h-full bg-black/50" />
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
    )
}
