'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Plane, Coins, AlertCircle } from 'lucide-react'

type GameState = 'IDLE' | 'Flying' | 'CRASHED'

export default function AviatorPage() {
    const [gameState, setGameState] = useState<GameState>('IDLE')
    const [multiplier, setMultiplier] = useState(1.00)
    const [crashPoint, setCrashPoint] = useState(0)
    const [betAmount, setBetAmount] = useState('100')
    const [cashedOut, setCashedOut] = useState(false)
    const [cashOutMultiplier, setCashOutMultiplier] = useState(0)
    const [history, setHistory] = useState<number[]>([])

    // Animation Refs
    const requestRef = useRef<number | null>(null)
    const startTimeRef = useRef<number | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Game Logic
    const startGame = () => {
        if (gameState === 'Flying') return

        setCashedOut(false)
        setMultiplier(1.00)
        setGameState('Flying')

        // Server generates crash point (Simulated)
        // Crash point logic: heavily weighted towards lower numbers
        const r = Math.random()
        // Simple inverse distribution for demo
        const generatedCrash = Math.max(1.00, (100 / (r * 100 + 1)) * (Math.random() * 5))
        // Or simple: 1 / rand
        // Let's use a simpler "Aviator-like" distribution mock
        // Many crashes at 1.x
        const crash = (0.99 / Math.random());
        // console.log("Crash point:", crash)
        setCrashPoint(crash)

        startTimeRef.current = Date.now()
        requestRef.current = requestAnimationFrame(animate)
    }

    const animate = () => {
        if (!startTimeRef.current) return

        const elapsed = Date.now() - startTimeRef.current
        // Exponential growth helper
        // current = 1.00 * e^(elapsed / speed)
        const newMultiplier = 1.00 + Math.pow(elapsed / 1000, 2) * 0.1
        // Simplified linear-ish visual for MVP, mostly exp later

        const currentMult = 1 + (elapsed / 3000) + (Math.pow(elapsed, 2) / 10000000)

        setMultiplier(currentMult)
        drawCanvas(currentMult, false)

        if (currentMult >= crashPoint) {
            handleCrash(currentMult)
        } else {
            requestRef.current = requestAnimationFrame(animate)
        }
    }

    const handleCrash = (finalMult: number) => {
        setGameState('CRASHED')
        setMultiplier(finalMult)
        drawCanvas(finalMult, true)
        setHistory(prev => [parseFloat(finalMult.toFixed(2)), ...prev.slice(0, 19)])
        cancelAnimationFrame(requestRef.current!)
    }

    const handleCashOut = () => {
        if (gameState !== 'Flying' || cashedOut) return
        setCashedOut(true)
        setCashOutMultiplier(multiplier)
        // Trigger WIN transaction here
    }

    // Canvas Drawing
    const drawCanvas = (currentMult: number, isCrashed: boolean) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const width = canvas.width
        const height = canvas.height

        // Clear
        ctx.clearRect(0, 0, width, height)

        // Draw Curve
        ctx.beginPath()
        ctx.moveTo(0, height)

        // Simple Bezier approximation of flight
        // X moves with time (0 to width)
        // Y moves with multiplier height

        // Map 1.00 -> X:0, Y:height
        // Map Crash -> X:width, Y:0

        // For visual loop: The plane stays somewhat centered or moves up-right
        const x = (Date.now() - (startTimeRef.current || 0)) / 50 // simplistic x movement
        const y = height - (Math.min(height, (currentMult - 1) * 100))

        // Draw Plane
        ctx.fillStyle = isCrashed ? '#ef4444' : '#ef5350' // Red
        ctx.beginPath()

        // Drawing a simple plane shape or line
        const px = Math.min(width - 50, 50 + x % (width - 100))
        const py = Math.max(50, height - ((currentMult - 1) * 150))

        // Curve trace
        ctx.lineWidth = 4
        ctx.strokeStyle = '#ef4444'
        ctx.beginPath()
        // This is tricky without history of points. 
        // For MVP, just draw the plane at current position

        // Draw Plane Body (Triangle)
        ctx.save()
        ctx.translate(px, py)
        // Check angle 
        ctx.rotate(-20 * Math.PI / 180)

        ctx.beginPath()
        ctx.fillStyle = '#ef4444'
        ctx.moveTo(10, 0)
        ctx.lineTo(-20, 10)
        ctx.lineTo(-20, -10)
        ctx.fill()

        ctx.restore()

        if (isCrashed) {
            ctx.fillStyle = 'white'
            ctx.font = 'bold 20px sans-serif'
            ctx.fillText("CRASHED", width / 2 - 40, height / 2)
        }
    }

    useEffect(() => {
        // Initial Draw
        const canvas = canvasRef.current
        if (canvas) {
            canvas.width = canvas.parentElement?.clientWidth || 800
            canvas.height = 400
        }
        return () => cancelAnimationFrame(requestRef.current!)
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Plane className="text-red-500" /> Aviator
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-card border border-border rounded-2xl relative overflow-hidden h-[500px] flex flex-col">
                    {/* Multiplier Centered */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className={`text-8xl font-black tracking-tighter transition-all ${gameState === 'CRASHED' ? 'text-red-600 scale-110' : 'text-white'
                            }`}>
                            {multiplier.toFixed(2)}x
                        </div>
                        {gameState === 'CRASHED' && (
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

                    {/* Background Grid/Stars can be CSS */}
                </div>

                <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6">
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                        <div className="text-muted-foreground text-sm uppercase mb-1">Next Round In</div>
                        <div className="text-xl font-bold text-white">Ready</div>
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
                        <div className="grid grid-cols-4 gap-2">
                            {['100', '200', '500', '1000'].map(v => (
                                <button key={v} onClick={() => setBetAmount(v)} className="text-xs py-1 bg-white/5 rounded hover:bg-white/10">{v}</button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto">
                        {gameState === 'Flying' && !cashedOut ? (
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
                                onClick={startGame}
                                disabled={gameState === 'Flying'}
                                className="w-full h-20 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-2xl rounded-xl shadow-[0_0_30px_rgba(22,163,74,0.4)] transition-all active:scale-95 border-b-4 border-green-800"
                            >
                                BET
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
