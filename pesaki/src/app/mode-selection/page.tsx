'use client'

import { useRouter } from 'next/navigation'
import { Wallet, Joystick } from 'lucide-react'

export default function ModeSelection() {
    const router = useRouter()

    const selectMode = (mode: 'demo' | 'real') => {
        // In a real app, we would save this preference to the user's session or local storage
        // For now, we'll just navigate to the dashboard with a query param or just default
        console.log(`Selected mode: ${mode}`)
        router.push(`/dashboard?mode=${mode}`)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-4xl z-10">
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-5xl font-bold tracking-tight text-white">Choose Your Mode</h1>
                    <p className="text-xl text-muted-foreground">Select how you want to play today</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Demo Mode Card */}
                    <div
                        onClick={() => selectMode('demo')}
                        className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-8 transition-all duration-300 hover:scale-[1.02] hover:bg-card/60 hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                            <div className="p-6 rounded-full bg-accent/20 text-accent ring-1 ring-accent/50 group-hover:scale-110 transition-transform duration-300">
                                <Joystick size={48} />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">Demo Mode</h2>
                                <div className="inline-flex items-center rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent border border-accent/20">
                                    Safe & Risk-Free
                                </div>
                            </div>

                            <p className="text-muted-foreground leading-relaxed">
                                Practice with virtual money. Access all games, learn strategies, and have fun without any financial risk.
                            </p>

                            <div className="w-full pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Starting Balance</span>
                                    <span className="font-bold text-accent">KSh 10,000</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Real Play Mode Card */}
                    <div
                        onClick={() => selectMode('real')}
                        className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-8 transition-all duration-300 hover:scale-[1.02] hover:bg-card/60 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                            <div className="p-6 rounded-full bg-primary/20 text-primary ring-1 ring-primary/50 group-hover:scale-110 transition-transform duration-300">
                                <Wallet size={48} />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">Real Play</h2>
                                <div className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary border border-primary/20">
                                    Win Real Cash
                                </div>
                            </div>

                            <p className="text-muted-foreground leading-relaxed">
                                Deposit and withdraw instantly via M-Pesa. Stake real money and win big on all our exclusive games.
                            </p>

                            <div className="w-full pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Min Deposit</span>
                                    <span className="font-bold text-white">KSh 10</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-muted-foreground/50 mt-12 text-sm">
                    You can switch modes at any time from your profile.
                </p>
            </div>
        </div>
    )
}
