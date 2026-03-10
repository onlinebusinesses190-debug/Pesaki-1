'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { Disc, Sparkles } from 'lucide-react'

type Segment = {
    id: number
    color: string
    label: string
    multiplier: number // 0 = Lose, 0.25 = Win 1/4, 0.5 = Win 1/2, 1 = Win Same
}

const SEGMENTS: Segment[] = [
    { id: 1, color: '#ef4444', label: 'TRY AGAIN', multiplier: 0 }, // Red
    { id: 2, color: '#f59e0b', label: 'WIN ½', multiplier: 0.5 }, // Amber
    { id: 3, color: '#10b981', label: 'WIN ¼', multiplier: 0.25 }, // Emerald
    { id: 4, color: '#3b82f6', label: 'WIN SAME', multiplier: 1.0 }, // Blue
    { id: 5, color: '#ef4444', label: 'TRY AGAIN', multiplier: 0 },
    { id: 6, color: '#f59e0b', label: 'WIN ½', multiplier: 0.5 },
    { id: 7, color: '#10b981', label: 'WIN ¼', multiplier: 0.25 },
]

export default function SpinDogoPage() {
    const [spinning, setSpinning] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [stake, setStake] = useState('100')
    const [lastWin, setLastWin] = useState<number | null>(null)
    const wheelRef = useRef<HTMLDivElement>(null)

    const spinWheel = () => {
        if (spinning) return
        setLastWin(null)
        setSpinning(true)

        // Game Logic (Client-side simulation of Server Logic)
        // PDF Rule: "No user can ever win more than their stake."
        // Bias towards lower multipliers or loss
        const rand = Math.random()
        let outcomeSegmentIndex = 0; // Default to first segment

        // Weighted probability
        if (rand < 0.4) {
            // 40% Lose (Segments 0, 4) if 0-indexed? 
            // Let's pick a 'TRY AGAIN' segment
            outcomeSegmentIndex = Math.random() < 0.5 ? 0 : 4
        } else if (rand < 0.7) {
            // 30% Win 1/4
            outcomeSegmentIndex = Math.random() < 0.5 ? 2 : 6
        } else if (rand < 0.9) {
            // 20% Win 1/2
            outcomeSegmentIndex = Math.random() < 0.5 ? 1 : 5
        } else {
            // 10% Win Same
            outcomeSegmentIndex = 3
        }

        const segmentAngle = 360 / SEGMENTS.length
        // Calculate needed rotation
        // To land on index i, we need to rotate so that segment i is at the top (or indicator position)
        // Indicator is usually at top (0 deg) or right (90 deg). Let's assume Top pointer.
        // If 0 deg is top, segment 0 is at 0-51 deg? 
        // Let's assure the wheel spin adds huge rotation + precise offset

        // Offset to center of the target segment
        // Segment 0 is at 0deg (starts top, goes CW). So Top pointer hits it at... 
        // Actually simplest is: Target Angle = 360 - (Index * SegmentAngle)

        const targetAngle = 360 - (outcomeSegmentIndex * segmentAngle)
        const fullSpins = 5 * 360 // 5 full spins
        const finalRotation = rotation + fullSpins + (targetAngle - (rotation % 360))
        // Add some random jitter within the segment?
        const jitter = (Math.random() - 0.5) * (segmentAngle * 0.8)

        setRotation(finalRotation + jitter)

        setTimeout(() => {
            setSpinning(false)
            // Calculate Pay out
            const result = SEGMENTS[outcomeSegmentIndex]
            if (result.multiplier > 0) {
                setLastWin(parseFloat(stake) * result.multiplier)
            } else {
                setLastWin(0)
            }
        }, 5000) // 5 seconds spin time as per PDF
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Disc className="text-purple-500" /> Spin Dogo
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                {/* Wheel Container */}
                <div className="relative flex justify-center items-center py-8">
                    {/* Indicator */}
                    <div className="absolute top-0 z-20 w-0 h-0 border-l-[20px] border-l-transparent border-t-[40px] border-t-white border-r-[20px] border-r-transparent drop-shadow-lg" />

                    {/* The Wheel */}
                    <div
                        className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full relative overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.3)] border-4 border-white/20 transition-transform cubic-bezier(0.2, 0, 0.2, 1)"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transitionDuration: '5s'
                        }}
                    >
                        {SEGMENTS.map((seg, i) => {
                            const angle = (360 / SEGMENTS.length)
                            const rotation = angle * i
                            return (
                                <div
                                    key={seg.id}
                                    className="absolute top-0 left-1/2 w-1/2 h-full origin-left flex items-center justify-center"
                                    style={{
                                        transform: `rotate(${rotation}deg) skewY(-${90 - angle}deg)`, // Complex CSS wheel construction or Conic Gradient
                                        // Conic gradient is easier for background, but text rotation is hard.
                                        // Let's try pure Conic Gradient for background and absolute positioned labels.
                                    }}
                                >
                                    {/* This approach (skewed divs) is tricky for 7 segments. 
                                        Better approach: Conic Gradient Background + Rotated Text elements overlay. */}
                                </div>
                            )
                        })}

                        {/* Fallback/Simpler Visual: Conic Gradient */}
                        <div
                            className="absolute inset-0 w-full h-full rounded-full"
                            style={{
                                background: `conic-gradient(
                                    #ef4444 0deg ${360 / 7}deg, 
                                    #f59e0b ${360 / 7}deg ${360 / 7 * 2}deg, 
                                    #10b981 ${360 / 7 * 2}deg ${360 / 7 * 3}deg, 
                                    #3b82f6 ${360 / 7 * 3}deg ${360 / 7 * 4}deg, 
                                    #ef4444 ${360 / 7 * 4}deg ${360 / 7 * 5}deg, 
                                    #f59e0b ${360 / 7 * 5}deg ${360 / 7 * 6}deg, 
                                    #10b981 ${360 / 7 * 6}deg 360deg
                                )`
                            }}
                        />

                        {/* Labels */}
                        {SEGMENTS.map((seg, i) => {
                            const angle = (360 / 7)
                            const rotate = angle * i + (angle / 2) // Center of segment
                            return (
                                <div
                                    key={i}
                                    className="absolute inset-0 flex justify-center pt-8"
                                    style={{ transform: `rotate(${rotate}deg)` }}
                                >
                                    <span className="text-white font-bold text-shadow rotate-180 writing-mode-vertical text-sm md:text-base tracking-wider drop-shadow-md">
                                        {seg.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Center Cap */}
                    <div className="absolute w-16 h-16 bg-gradient-to-br from-white to-gray-300 rounded-full shadow-xl flex items-center justify-center z-10">
                        <Disc className="text-purple-600" size={32} />
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-8">
                    <div className="text-center space-y-2">
                        {lastWin !== null && (
                            <div className={`text-2xl font-bold animate-bounce ${lastWin > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {lastWin > 0 ? `YOU WON KSh ${lastWin}!` : 'Try Again!'}
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
                            {['50', '100', '200', '500', '1000', 'MAX'].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setStake(amt === 'MAX' ? '5000' : amt)}
                                    className={`py-2 rounded-lg text-sm font-bold border transition-all ${stake === (amt === 'MAX' ? '5000' : amt)
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

                    <button
                        onClick={spinWheel}
                        disabled={spinning}
                        className="w-full py-4 text-xl font-black rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        SPIN WHEEL
                    </button>

                    <div className="text-xs text-center text-muted-foreground">
                        <Sparkles className="inline w-3 h-3 mr-1" />
                        Max Win Limit: 1x Stake
                    </div>
                </div>
            </div>
        </div>
    )
}
