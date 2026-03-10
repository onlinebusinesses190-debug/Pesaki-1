'use client'

import { Shield, Users, BarChart3, Settings, LogOut, Lock } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-zinc-950 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-white/10 gap-2">
                    <Shield className="text-red-500" />
                    <span className="font-bold tracking-wider">PESAKI ADMIN</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-white font-medium">
                        <BarChart3 size={20} /> Dashboard
                    </Link>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 font-medium transition-all">
                        <Users size={20} /> Users & KYC
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 font-medium transition-all">
                        <Settings size={20} /> Game Config
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 font-medium transition-all">
                        <Lock size={20} /> Security
                    </button>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button className="flex items-center gap-2 text-red-500 hover:text-red-400">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-auto bg-zinc-950">
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur">
                    <h2 className="font-bold">System Status: <span className="text-green-500">ONLINE</span></h2>
                    <div className="flex gap-4">
                        <div className="text-xs text-right">
                            <div className="text-zinc-400">Server Time</div>
                            <div className="font-mono">{new Date().toLocaleTimeString()}</div>
                        </div>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
