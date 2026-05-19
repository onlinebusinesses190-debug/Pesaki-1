'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Wallet, Phone, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type DepositStatus = 'idle' | 'pending' | 'waiting' | 'success' | 'failed'

// Mask phone: 2547XXXXXXXX → 2547XX****XX
function maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return phone
    return phone.slice(0, 6) + '****' + phone.slice(-2)
}

export default function WalletPage() {
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode') || 'demo'
    const isDemo = mode === 'demo'

    const [registeredPhone, setRegisteredPhone] = useState<string | null>(null)
    const [balance, setBalance] = useState<number | null>(null)
    const [amount, setAmount] = useState('100')
    const [status, setStatus] = useState<DepositStatus>('idle')
    const [message, setMessage] = useState('')
    const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
    const [history, setHistory] = useState<any[]>([])

    const QUICK_AMOUNTS = ['50', '100', '500', '1000', '2000', '5000']

    // Fetch user's registered phone and balance on mount
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get profile phone
            const { data: profile } = await supabase
                .from('profiles')
                .select('phone')
                .eq('id', user.id)
                .single()

            if (profile?.phone) {
                setRegisteredPhone(profile.phone)
            }

            // Get wallet balance
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .single()

            if (wallet) {
                setBalance(Number(wallet.balance))
            }

            // Get history
            const { data: ledger } = await supabase
                .from('wallet_ledger')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (ledger) {
                setHistory(ledger)
            }
        }
        fetchData()
    }, [])

    // Real-time listener for deposit status
    useEffect(() => {
        if (status !== 'waiting' || !checkoutRequestId) return

        const supabase = createClient()
        const channel = supabase
            .channel(`deposit_${checkoutRequestId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'mpesa_deposits',
                    filter: `checkout_request_id=eq.${checkoutRequestId}`,
                },
                (payload) => {
                    if (payload.new.status === 'completed') {
                        setStatus('success')
                        setMessage('Payment received! Your wallet has been credited.')
                        // Refresh balance
                        setBalance((prev) => (prev || 0) + Number(payload.new.amount))
                    } else if (payload.new.status === 'failed') {
                        setStatus('failed')
                        setMessage('The M-Pesa transaction was cancelled or failed.')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [status, checkoutRequestId])

    const handleDeposit = async () => {
        if (!amount || Number(amount) < 10) {
            setMessage('Minimum deposit is KSh 10.')
            return
        }

        setStatus('pending')
        setMessage('')

        try {
            // Only send amount — backend auto-uses the registered phone
            const res = await fetch('/api/p/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(amount) }),
            })

            const data = await res.json()

            if (!res.ok || data.error) {
                setStatus('failed')
                setMessage(data.error || 'Failed to initiate payment. Please try again.')
                return
            }

            setStatus('waiting')
            setCheckoutRequestId(data.CheckoutRequestID)
            setMessage(data.CustomerMessage || 'STK Push sent! Check your phone for the M-Pesa prompt.')
        } catch (err) {
            console.error('Deposit Error:', err)
            setStatus('failed')
            setMessage('Network error. Please check your connection and try again.')
        }
    }

    const reset = () => {
        setStatus('idle')
        setMessage('')
    }

    const handleWithdraw = async () => {
        if (!amount || Number(amount) < 100) {
            setMessage('Minimum withdrawal is KSh 100.')
            return
        }

        setStatus('pending')
        setMessage('')

        try {
            const res = await fetch('/api/p/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(amount) }),
            })

            const data = await res.json()

            if (!res.ok || data.error) {
                setStatus('failed')
                setMessage(data.error || 'Withdrawal failed. Please try again later.')
                return
            }

            setStatus('success')
            setMessage(data.message || 'Withdrawal request received. Your funds will be sent to you within 24 hours.')
        } catch {
            setStatus('failed')
            setMessage('Network error. Please try again.')
        }
    }

    if (isDemo) {
        return (
            <div className="max-w-lg mx-auto space-y-6 py-8">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto">
                        <Wallet size={32} className="text-accent" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Demo Wallet</h1>
                    <p className="text-zinc-400">You are in Demo Mode. Switch to Real Market to deposit and withdraw real money.</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
                    <div className="text-6xl font-black text-white">KSh 10,000</div>
                    <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">Virtual Balance</div>
                    <a
                        href="/mode-selection"
                        className="block w-full py-3 mt-4 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all"
                    >
                        Switch to Real Market
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-4">
            {/* Balance Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                <div className="relative flex justify-between items-end">
                    <div className="space-y-1">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Available Balance</div>
                        <div className="text-5xl font-black text-white flex items-baseline gap-2">
                            <span className="text-2xl text-emerald-500 font-bold">KSh</span>
                            {balance !== null ? balance.toLocaleString() : '---'}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter border border-emerald-500/20">
                            Real Account
                        </div>
                        <div className="text-[10px] text-zinc-600 font-medium">Safe & Encrypted</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                {(['deposit', 'withdraw'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); reset() }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all capitalize ${activeTab === tab
                            ? (tab === 'deposit' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-orange-600 text-white shadow-lg')
                            : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        {tab === 'deposit' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                        {tab}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {/* Status States */}
                {status === 'waiting' && activeTab === 'deposit' && (
                    <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-6 flex items-start gap-4">
                        <div className="mt-1 flex-shrink-0">
                            <Loader2 size={24} className="text-emerald-400 animate-spin" />
                        </div>
                        <div>
                            <div className="font-bold text-emerald-400 mb-1">Waiting for Payment</div>
                            <div className="text-sm text-zinc-300">{message}</div>
                            {registeredPhone && (
                                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                    <Phone size={11} />
                                    Prompt sent to {maskPhone(registeredPhone)}
                                </div>
                            )}
                            <button onClick={reset} className="mt-4 text-xs text-zinc-400 hover:text-white underline">
                                Start a new transaction
                            </button>
                        </div>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="bg-red-950/50 border border-red-500/30 rounded-2xl p-6 flex items-start gap-4">
                        <XCircle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold text-red-400 mb-1">Transaction Failed</div>
                            <div className="text-sm text-zinc-300">{message}</div>
                            <button onClick={reset} className="mt-3 text-xs px-4 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-6 flex items-start gap-4">
                        <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold text-emerald-400 mb-1">{activeTab === 'deposit' ? 'Deposit Successful!' : 'Withdrawal Requested!'}</div>
                            <div className="text-sm text-zinc-300">{message}</div>
                            <button onClick={reset} className="mt-4 text-xs text-zinc-400 hover:text-white underline">
                                Back to Wallet
                            </button>
                        </div>
                    </div>
                )}

                {(status === 'idle' || status === 'pending') && (
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">

                        {/* Registered phone display */}
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                <Phone size={15} className="text-zinc-400" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                                    {activeTab === 'deposit' ? 'Funds will be pulled from' : 'Funds will be sent to'}
                                </div>
                                <div className="text-white font-bold text-sm mt-0.5">
                                    {registeredPhone ? maskPhone(registeredPhone) : 'Loading...'}
                                </div>
                            </div>
                            <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Verified
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-300">Amount (KSh)</label>
                            {activeTab === 'deposit' && (
                                <div className="grid grid-cols-3 gap-2">
                                    {QUICK_AMOUNTS.map(a => (
                                        <button
                                            key={a}
                                            onClick={() => setAmount(a)}
                                            className={`py-2 rounded-lg text-sm font-bold border transition-all ${amount === a
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {Number(a).toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <input
                                type="number"
                                min={activeTab === 'deposit' ? 10 : 100}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                            {message && status === 'idle' && (
                                <p className="text-xs text-red-400">{message}</p>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="bg-black/20 rounded-xl p-4 flex justify-between items-center text-sm">
                            <span className="text-zinc-400">{activeTab === 'deposit' ? 'You will receive' : 'You will withdraw'}</span>
                            <span className="text-white font-bold text-lg">KSh {Number(amount || 0).toLocaleString()}</span>
                        </div>

                        {/* CTA */}
                        {activeTab === 'deposit' ? (
                            <button
                                onClick={handleDeposit}
                                disabled={status === 'pending' || !registeredPhone}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black text-lg shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
                            >
                                {status === 'pending' ? <><Loader2 size={20} className="animate-spin" /> Processing...</> : 'PAY WITH M-PESA'}
                            </button>
                        ) : (
                            <button
                                onClick={handleWithdraw}
                                disabled={status === 'pending' || !registeredPhone}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-lg shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
                            >
                                {status === 'pending' ? <><Loader2 size={20} className="animate-spin" /> Processing...</> : 'WITHDRAW TO M-PESA'}
                            </button>
                        )}

                        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
                            <ShieldCheck size={14} />
                            Secured by Safaricom Daraja API
                        </div>
                    </div>
                )}
            </div>

            {/* How it works */}
            {status === 'idle' && (
                <div className="bg-white/2 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">How it works</h3>
                    <div className="space-y-3">
                        {(activeTab === 'deposit' ? [
                            { step: '1', text: 'Select an amount above.' },
                            { step: '2', text: 'Click "Pay with M-Pesa" — an STK Push prompt will be sent to your registered number.' },
                            { step: '3', text: 'Enter your M-Pesa PIN to confirm the payment.' },
                            { step: '4', text: 'Your Pesaki wallet will be credited instantly.' },
                        ] : [
                            { step: '1', text: 'Enter the amount you wish to withdraw.' },
                            { step: '2', text: 'Click "Withdraw to M-Pesa" to submit your request.' },
                            { step: '3', text: 'Your request will be placed in a queue for processing.' },
                            { step: '4', text: 'You will receive your funds within 24 hours.' },
                        ]).map(({ step, text }) => (
                            <div key={step} className="flex items-start gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${activeTab === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    {step}
                                </div>
                                <p className="text-sm text-zinc-400">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Transaction History */}
            <div className="bg-card border border-border rounded-2xl p-6 mt-8">
                <h3 className="text-lg font-bold text-white mb-4">Transaction History</h3>
                {history.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-sm border border-white/5 rounded-xl">
                        No transactions found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-xs text-zinc-500 uppercase tracking-wider">
                                    <th className="py-3 font-medium">Date</th>
                                    <th className="py-3 font-medium">Type</th>
                                    <th className="py-3 font-medium">Description</th>
                                    <th className="py-3 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((tx) => (
                                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 text-sm text-zinc-400">
                                            {new Date(tx.created_at).toLocaleString()}
                                        </td>
                                        <td className="py-3">
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                                                tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm text-zinc-300">
                                            {tx.description}
                                        </td>
                                        <td className={`py-3 text-sm font-bold text-right ${
                                            tx.type === 'credit' ? 'text-emerald-400' : 'text-white'
                                        }`}>
                                            {tx.type === 'credit' ? '+' : '-'}KSh {Number(tx.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
