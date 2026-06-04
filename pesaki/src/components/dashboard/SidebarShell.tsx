'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
    Home,
    Wallet,
    LineChart,
    Gamepad2,
    Plane,
    Disc,
    TrendingUp,
    Settings,
    LogOut,
    X,
    Menu as MenuIcon,
    ShieldCheck,
    Coins
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { WalletState } from '@/app/actions/wallet'

export default function Sidebar({ wallet }: { wallet: WalletState | null }) {
    return (
        <DashboardShell wallet={wallet} />
    )
}

function DashboardShell({ wallet }: { wallet: WalletState | null }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()
    const mode = (searchParams.get('mode') as 'real' | 'demo') || 'demo'

    const handleSignOut = async () => {
        const res = await fetch('/api/auth/logout', { method: 'POST' })
        const data = await res.json()

        if (!res.ok || data.error) {
            console.error('Logout failed', data.error)
            return
        }

        router.push('/login')
        router.refresh()
    }

    const balance = wallet
        ? (mode === 'real' ? wallet.balance : wallet.demo_balance)
        : (mode === 'demo' ? 1000 : 0)

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
        { name: 'Binary FX', href: '/dashboard/fx', icon: LineChart },
        { name: 'Up & Down', href: '/dashboard/up-down', icon: TrendingUp },
        { name: 'AviMarket', href: '/dashboard/aviator', icon: Plane },
        { name: 'Market Spin', href: '/dashboard/spin', icon: Disc },
        { name: 'Invest', href: '/dashboard/invest', icon: Gamepad2 },
    ]

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col">
                    <div className="h-16 flex items-center px-6 border-b border-white/5">
                        <Link href="/" className="flex items-center gap-2">
                            <Image src="/logo.png" alt="Pesaki Logo" width={36} height={36} className="h-8 w-auto" />
                            <span className="font-extrabold text-lg tracking-wide text-white uppercase">Pesaki</span>
                        </Link>
                        <button
                            onClick={toggleSidebar}
                            className="ml-auto lg:hidden text-muted-foreground hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-4">
                        <div className={`rounded-xl p-4 border ${mode === 'real'
                                ? 'bg-primary/10 border-primary/20'
                                : 'bg-accent/10 border-accent/20'
                            }`}>
                            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                                Current Mode
                            </div>
                            <div className={`text-lg font-bold flex items-center gap-2 ${mode === 'real' ? 'text-primary' : 'text-accent'
                                }`}>
                                {mode === 'real' ? 'Real Market' : 'Demo Mode'}
                                <div className={`w-2 h-2 rounded-full animate-pulse ${mode === 'real' ? 'bg-primary' : 'bg-accent'
                                    }`} />
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                                KSh {(balance ?? 0).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            const Icon = item.icon

                            return (
                                <Link
                                    key={item.href}
                                    href={`${item.href}?mode=${mode}`}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon size={20} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="p-4 border-t border-white/5 space-y-2">
                        <Link href={`/dashboard/settings?mode=${mode}`} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${pathname === '/dashboard/settings'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                            }`}>
                            <Settings size={20} />
                            Settings
                        </Link>
                        <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-all">
                            <LogOut size={20} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}

export function SidebarShell({ children, wallet }: { children: React.ReactNode, wallet: WalletState | null }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            <SidebarContent
                wallet={wallet}
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 lg:hidden flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
                    <button
                        onClick={toggleSidebar}
                        className="text-muted-foreground hover:text-white"
                    >
                        <MenuIcon />
                    </button>
                    <span className="font-bold text-white">Dashboard</span>
                    <div className="w-6" />
                </header>

                <div className="flex-1 overflow-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}

function SidebarContent({ wallet, isSidebarOpen, toggleSidebar }: any) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()
    const [supabase, setSupabase] = useState<any>(null)

    useEffect(() => {
        import('@/utils/supabase/client').then(({ createClient }) => {
            setSupabase(() => createClient())
        })
    }, [])
    const mode = (searchParams.get('mode') as 'real' | 'demo') || 'demo'

    const handleSignOut = async () => {
        if (!supabase) return
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const balance = wallet
        ? (mode === 'real' ? wallet.balance : wallet.demo_balance)
        : (mode === 'demo' ? 1000 : 0)

    const [role, setRole] = useState<string | null>(null)

    useEffect(() => {
        const fetchRole = async () => {
            if (!supabase) return
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                if (profile) setRole(profile.role)
            }
        }
        fetchRole()
    }, [supabase])

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
        { name: 'Binary FX', href: '/dashboard/fx', icon: LineChart },
        { name: 'Up & Down', href: '/dashboard/up-down', icon: TrendingUp },
        { name: 'AviMarket', href: '/dashboard/aviator', icon: Plane },
        { name: 'Market Spin', href: '/dashboard/spin', icon: Disc },
        { name: 'Invest', href: '/dashboard/invest', icon: Gamepad2 },
    ]

    if (role === 'admin') {
        navItems.push({ name: 'Admin Oversight', href: '/dashboard/admin', icon: ShieldCheck })
    }

    return (
        <>
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col">
                    <div className="h-16 flex items-center px-6 border-b border-white/5">
                        <Link href="/" className="flex items-center gap-2">
                            <Image src="/logo.png" alt="Pesaki Logo" width={36} height={36} className="h-8 w-auto" />
                            <span className="font-extrabold text-lg tracking-wide text-white uppercase">Pesaki</span>
                        </Link>
                        <button
                            onClick={toggleSidebar}
                            className="ml-auto lg:hidden text-muted-foreground hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-4">
                        <div className={`rounded-xl p-4 border ${mode === 'real'
                                ? 'bg-primary/10 border-primary/20'
                                : 'bg-accent/10 border-accent/20'
                            }`}>
                            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                                Current Mode
                            </div>
                            <div className={`text-lg font-bold flex items-center gap-2 ${mode === 'real' ? 'text-primary' : 'text-accent'
                                }`}>
                                {mode === 'real' ? 'Real Market' : 'Demo Mode'}
                                <div className={`w-2 h-2 rounded-full animate-pulse ${mode === 'real' ? 'bg-primary' : 'bg-accent'
                                    }`} />
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                                KSh {(balance ?? 0).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            const Icon = item.icon

                            return (
                                <Link
                                    key={item.href}
                                    href={`${item.href}?mode=${mode}`}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon size={20} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="p-4 border-t border-white/5 space-y-2">
                        <Link href={`/dashboard/settings?mode=${mode}`} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${pathname === '/dashboard/settings'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                            }`}>
                            <Settings size={20} />
                            Settings
                        </Link>
                        <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-all">
                            <LogOut size={20} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}
