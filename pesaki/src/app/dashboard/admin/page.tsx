'use client'

import { useState, useEffect } from 'react'
import { 
    Users, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    DollarSign, 
    TrendingUp, 
    Activity,
    Search,
    RefreshCw,
    AlertCircle,
    UserCircle,
    ShieldAlert
} from 'lucide-react'
import { apiRequest } from '@/utils/api'
import { toast } from 'sonner'

interface AdminStats {
    totalDeposits: number
    totalWithdrawals: number
    netProfit: number
    totalUsers: number
    totalUserBalance: number
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchStats = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiRequest('/api/admin/stats')
            setStats(res.stats)
        } catch (err: any) {
            setError(err.message || 'Forbidden: Admin access required')
            toast.error('Failed to load admin metrics')
        } finally {
            setLoading(false)
        }
    }

    const handleSimulate = async (type: string) => {
        const loadingToast = toast.loading('Simulating M-Pesa callback...')
        try {
            const res = await apiRequest('/api/admin/simulate', {
                method: 'POST',
                body: JSON.stringify({ type })
            })
            toast.success(res.message, { id: loadingToast })
            fetchStats() // Refresh balances
        } catch (err: any) {
            toast.error(err.message || 'Simulation failed', { id: loadingToast })
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <RefreshCw className="w-10 h-10 animate-spin text-primary" />
                <p className="text-zinc-500 font-medium">Gathering platform metrics...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-zinc-400 max-w-md">{error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white">Platform Oversight</h1>
                    <p className="text-zinc-400 mt-1">Real-time health and liquidity metrics for Pesaki.</p>
                </div>
                <button 
                    onClick={fetchStats}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-400 hover:text-white transition-all"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh Data
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Deposits" 
                    value={`KSh ${stats?.totalDeposits?.toLocaleString()}`} 
                    icon={ArrowUpCircle} 
                    color="text-emerald-500"
                    trend="+12% from last week"
                />
                <StatCard 
                    title="Total Withdrawals" 
                    value={`KSh ${stats?.totalWithdrawals?.toLocaleString()}`} 
                    icon={ArrowDownCircle} 
                    color="text-red-500"
                    trend="-5% from last week"
                />
                <StatCard 
                    title="Net Platform Profit" 
                    value={`KSh ${stats?.netProfit?.toLocaleString()}`} 
                    icon={TrendingUp} 
                    color="text-primary"
                    trend="Operating margin: 15%"
                />
                <StatCard 
                    title="User Liquidity" 
                    value={`KSh ${stats?.totalUserBalance?.toLocaleString()}`} 
                    icon={DollarSign} 
                    color="text-amber-500"
                    trend="Total funds held in wallets"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Snapshot */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                         <Users size={20} className="text-primary" /> Active Users
                    </h2>
                    <div className="space-y-4">
                        <p className="text-4xl font-black text-white">{stats?.totalUsers}</p>
                        <p className="text-sm text-zinc-500">Registered accounts on the platform.</p>
                        
                        <div className="pt-6 border-t border-border space-y-4">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Quick Actions</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <ActionBtn icon={UserCircle} label="User Lookup" />
                                <ActionBtn icon={Activity} label="Game Logs" />
                                <ActionBtn icon={AlertCircle} label="System Alerts" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sandbox Simulation */}
                <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <RefreshCw size={18} className="text-primary" /> Sandbox Simulation
                    </h2>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                        Manually trigger callbacks for the latest <b>Pending</b> transaction.
                    </p>
                    <div className="space-y-3">
                        <button 
                            onClick={() => handleSimulate('deposit')}
                            className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all"
                        >
                            Approve Latest Deposit
                        </button>
                        <button 
                            onClick={() => handleSimulate('withdraw_success')}
                            className="w-full py-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-orange-500/20 transition-all"
                        >
                            Approve Latest Withdraw
                        </button>
                        <button 
                            onClick={() => handleSimulate('withdraw_fail')}
                            className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-red-500/20 transition-all"
                        >
                            Fail & Refund Withdraw
                        </button>
                    </div>
                </div>

                {/* Liquidity Warning */}
                <div className="lg:col-span-1 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2 mb-4">
                        <AlertCircle size={18} /> Liquidity Audit
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                        The current net platform profit accounts for house edge and deposits minus all user-held balances. Ensure the Daraja B2C balance is sufficient to cover <b>KSh {stats?.totalUserBalance?.toLocaleString()}</b> in potential withdrawals.
                    </p>
                    <div className="mt-6 pt-6 border-t border-amber-500/10">
                        <button className="w-full py-3 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all">
                            Verify Bank Reserve
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color, trend }: any) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-black text-white mt-1">{value}</p>
            </div>
            <p className="text-[10px] text-zinc-600 font-medium">{trend}</p>
        </div>
    )
}

function ActionBtn({ icon: Icon, label }: any) {
    return (
        <button className="flex flex-col items-center justify-center p-4 gap-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all text-zinc-500 hover:text-white">
            <Icon size={24} />
            <span className="text-[11px] font-bold uppercase tracking-tight">{label}</span>
        </button>
    )
}
