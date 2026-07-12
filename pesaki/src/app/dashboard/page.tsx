export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getWallet } from '@/app/actions/wallet'
import {
    ArrowUpRight,
    Building2,
    BriefcaseBusiness,
    ChartNoAxesCombined,
    Wallet,
    Landmark,
    History,
    ShieldCheck
} from 'lucide-react'

export default async function DashboardHome({
    searchParams
}: {
    searchParams: Promise<{ mode?: string }>
}) {
    const wallet = await getWallet()
    const params = await searchParams

    const mode = params.mode || 'demo'
    const isDemo = mode === 'demo'

    const balance = wallet
        ? (isDemo ? wallet.demo_balance : wallet.balance)
        : (isDemo ? 1000 : 0)

    const services = [
        {
            title: 'Trading',
            description: 'Access PESAKI markets, Forex and predictions.',
            icon: <ChartNoAxesCombined size={26} />,
            href: '/dashboard/fx',
            tag: 'Markets'
        },
        {
            title: 'Banking Hub',
            description: 'Save, grow and manage your money.',
            icon: <Landmark size={26} />,
            href: '/dashboard/banking',
            tag: 'Finance'
        },
        {
            title: 'KAZI Link',
            description: 'Find jobs and earn through PESAKI.',
            icon: <BriefcaseBusiness size={26} />,
            href: '/dashboard/kazi',
            tag: 'Jobs'
        },
        {
            title: 'Business Hub',
            description: 'Connect businesses with funding.',
            icon: <Building2 size={26} />,
            href: '/dashboard/business',
            tag: 'Growth'
        }
    ]

    const trading = [
        {
            name: 'Binary FX',
            href: '/dashboard/fx'
        },
        {
            name: 'AviMarket',
            href: '/dashboard/aviator'
        },
        {
            name: 'Up & Down',
            href: '/dashboard/up-down'
        },
        {
            name: 'Market Spin',
            href: '/dashboard/spin'
        },
        {
            name: 'Kenyan Market',
            href: '/dashboard/invest'
        }
    ]

    return (
        <main className="space-y-8 pb-10">

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between gap-6">

                    <div>
                        <p className="text-sm text-zinc-400">
                            Welcome back
                        </p>

                        <h1 className="text-3xl md:text-4xl font-black text-white mt-2">
                            PESAKI
                            <span className="text-emerald-400"> Hub</span>
                        </h1>

                        <p className="text-zinc-400 mt-3 max-w-md">
                            Your financial ecosystem for trading,
                            saving, opportunities and business growth.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 min-w-[220px]">
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Wallet size={16}/>
                            Balance
                        </div>

                        <div className="text-3xl font-black text-white mt-3">
                            KSh {(balance ?? 0).toLocaleString()}
                        </div>

                        <div className="text-xs mt-2 text-emerald-400">
                            {isDemo ? 'Demo Mode' : 'Live Wallet'}
                        </div>
                    </div>

                </div>
            </section>


            <section>
                <h2 className="text-xl font-bold text-white mb-4">
                    PESAKI Ecosystem
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {services.map((item) => (
                        <Link
                            key={item.title}
                            href={item.href}
                            className="group rounded-2xl border border-white/10 bg-zinc-900/50 p-6 hover:bg-zinc-800 transition"
                        >

                            <div className="flex justify-between">

                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                    {item.icon}
                                </div>

                                <ArrowUpRight
                                    className="text-zinc-500 group-hover:text-white"
                                />

                            </div>


                            <h3 className="text-xl font-bold text-white mt-5">
                                {item.title}
                            </h3>

                            <p className="text-sm text-zinc-400 mt-2">
                                {item.description}
                            </p>

                            <span className="inline-block mt-4 text-xs text-emerald-400">
                                {item.tag}
                            </span>

                        </Link>
                    ))}

                </div>
            </section>


            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">
                        Quick Trading
                    </h2>

                    <Link
                        href={`/dashboard/fx?mode=${mode}`}
                        className="text-sm text-zinc-400"
                    >
                        View all
                    </Link>
                </div>


                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

                    {trading.map((item)=>(
                        <Link
                            key={item.name}
                            href={`${item.href}?mode=${mode}`}
                            className="rounded-xl border border-white/10 bg-zinc-900 p-4 text-center hover:bg-zinc-800"
                        >
                            <p className="text-sm font-semibold text-white">
                                {item.name}
                            </p>
                        </Link>
                    ))}

                </div>
            </section>


            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
                    <History className="text-zinc-400"/>
                    <p className="text-zinc-500 text-sm mt-3">
                        Activity
                    </p>
                    <p className="text-white font-bold">
                        No recent activity
                    </p>
                </div>


                <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
                    <ShieldCheck className="text-emerald-400"/>
                    <p className="text-zinc-500 text-sm mt-3">
                        Security
                    </p>
                    <p className="text-white font-bold">
                        Protected Wallet
                    </p>
                </div>


                <Link
                    href="/dashboard/wallet?mode=real"
                    className="rounded-xl bg-emerald-600 p-5 hover:bg-emerald-500"
                >
                    <Wallet/>
                    <p className="text-white font-bold mt-3">
                        Deposit via M-Pesa
                    </p>
                </Link>

            </section>

        </main>
    )
}
