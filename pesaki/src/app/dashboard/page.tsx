export const dynamic = 'force-dynamic'
import { getWallet } from '@/app/actions/wallet'
import Link from 'next/link'
import { TrendingUp, Plane, Disc, Building2, ArrowUpRight, Wallet, History, Star } from 'lucide-react'

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
    const wallet = await getWallet()
    const params = await searchParams;
    const mode = params.mode || 'demo'
    const isDemo = mode === 'demo'

    const balance = wallet
        ? (isDemo ? wallet.demo_balance : wallet.balance)
        : (isDemo ? 1000 : 0)

    const FEATURED_GAMES = [
        { name: 'Binary FX', icon: <TrendingUp />, href: '/dashboard/fx', color: 'bg-emerald-500', desc: 'Trade Forex pairs with high leverage.' },
        { name: 'AviMarket', icon: <Plane />, href: '/dashboard/aviator', color: 'bg-red-500', desc: 'Market-linked multiplier — predict how far the market flies.' },
        { name: 'Up & Down', icon: <ArrowUpRight />, href: '/dashboard/up-down', color: 'bg-blue-500', desc: 'Simple market direction prediction.' },
        { name: 'Market Spin', icon: <Disc />, href: '/dashboard/spin', color: 'bg-purple-500', desc: 'Spin the market wheel to win instant prizes.' },
        { name: 'Kenyan Market', icon: <Building2 />, href: '/dashboard/invest', color: 'bg-amber-500', desc: 'Daily predictions on NSE companies.' },
    ]

    return (
        <div className="space-y-10 pb-12">
            {/* Welcome Banner */}
            <div className={`relative overflow-hidden rounded-3xl p-8 border border-white/5 bg-gradient-to-br transition-all duration-500 ${isDemo ? 'from-zinc-900 to-zinc-950' : 'from-indigo-600/20 to-black'
                }`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                            Welcome back, Explorer!
                        </h1>
                        <p className="text-zinc-400">
                            {isDemo ? (
                                <>You're currently trading in <span className="font-bold text-blue-400">DEMO</span> mode.</>
                            ) : (
                                <>Access real-time markets and place your trades.</>
                            )}
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col items-center md:items-end">
                        <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Available Balance</span>
                        <div className="text-4xl font-black text-white flex items-center gap-2">
                            <span className="text-zinc-500 text-xl">KSh</span>
                            {(balance ?? 0).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Active Tradings', value: FEATURED_GAMES.length.toString(), icon: <ZapIcon /> },
                    { label: 'Total Wins', value: 'KSh 0.00', icon: <History /> },
                    { label: 'Platform Rank', value: 'Beginner', icon: <Star /> },
                    { label: 'Safety Score', value: '100%', icon: <ShieldIcon /> },
                ].map((stat, i) => (
                    <div key={i} className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400">
                            {stat.icon}
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 font-medium">{stat.label}</div>
                            <div className="text-lg font-bold text-white">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tradings Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Featured Tradings
                    </h2>
                    <Link href={`/dashboard?mode=${mode}`} className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">SEE ALL</Link>
                </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURED_GAMES.map((game, i) => {
                        const GameContent = (
                            <>
                                <div className={`absolute top-0 right-0 w-32 h-32 ${game.color} opacity-[0.03] blur-3xl group-hover:opacity-[0.08] transition-opacity`} />

                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${game.color} shadow-lg shadow-${game.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`}>
                                        {game.icon}
                                    </div>
                                    <ArrowUpRight className="text-zinc-700 group-hover:text-white transition-colors" size={20} />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1">{game.name}</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    {game.desc}
                                </p>
                            </>
                        )

                        return (
                            <Link
                                key={i}
                                href={`${game.href}?mode=${mode}`}
                                className="group relative bg-card/50 border border-border rounded-2xl p-6 hover:border-white/20 hover:bg-zinc-900 transition-all duration-300 overflow-hidden"
                            >
                                {GameContent}
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Footer Info */}
            {isDemo ? (
                <div className="p-8 rounded-2xl bg-zinc-950 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-accent/30 flex items-center justify-center text-accent">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Need more demo funds?</div>
                            <div className="text-xs text-zinc-500">Demo accounts reset automatically every 24 hours.</div>
                        </div>
                    </div>
                    <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">
                        REFRESH SESSION
                    </button>
                </div>
            ) : (
                <div className="p-8 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-black border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Ready to trade with real money?</div>
                            <div className="text-xs text-zinc-400">Deposit instantly via M-Pesa. Minimum KSh 10.</div>
                        </div>
                    </div>
                    <a
                        href={`/dashboard/wallet?mode=real`}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95"
                    >
                        DEPOSIT VIA M-PESA
                    </a>
                </div>
            )}
        </div>
    )
}

function ZapIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.71 14.71 4H20v5.29L9.29 20H4v-5.29Z" /><path d="m11 11 3 3" /></svg>
}

function ShieldIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.32a.62.62 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
}
