'use client'

import { useState, useEffect } from 'react'
import {
    User, Shield, Bell, HelpCircle, Lock, Smartphone, ChevronRight, Save, Info,
    AlertTriangle, Mail, MessageSquare, Headphones, LogOut, CheckCircle2, ChevronDown, FileText
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const TABS = [
    { id: 'profile', label: 'Profile', icon: User, desc: 'Personal details' },
    { id: 'security', label: 'Security', icon: Shield, desc: 'Password & login' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & emails' },
    { id: 'gaming', label: 'Responsible Marketting', icon: Info, desc: 'Limits & exclusion' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, desc: 'FAQs & contact' },
]

export default function SettingsPage() {
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode') || 'demo'
    const [activeTab, setActiveTab] = useState('profile')
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)

    // Profile State
    const [fullName, setFullName] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    // Security State
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

    // Notification State
    const [emailNotifs, setEmailNotifs] = useState(true)
    const [smsNotifs, setSmsNotifs] = useState(true)
    const [promoNotifs, setPromoNotifs] = useState(false)

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileData) {
                    setProfile(profileData)
                    setFullName(profileData.full_name || '')
                }
            }
        }
        fetchUser()
    }, [])

    const handleSaveProfile = async () => {
        setIsSavingProfile(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user.id)

        if (error) {
            toast.error('Failed to update profile')
        } else {
            toast.success('Profile updated successfully')
        }
        setIsSavingProfile(false)
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setIsUpdatingPassword(true)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: newPassword })

        if (error) {
            toast.error('Failed to update password. Make sure you are logged in.')
        } else {
            toast.success('Password updated successfully')
            setNewPassword('')
            setConfirmPassword('')
        }
        setIsUpdatingPassword(false)
    }

    const maskPhone = (phone: string) => {
        if (!phone) return ''
        return phone.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2')
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
                <p className="text-zinc-400 mt-1 font-medium">Manage your account preferences and security.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar - Navigation */}
                <div className="lg:col-span-1 space-y-2 relative">
                    {TABS.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex justify-between items-center px-4 py-3.5 rounded-2xl relative z-10 transition-colors ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={isActive ? 'text-primary' : ''} />
                                    <div className="text-left leading-tight">
                                        <div className="text-sm font-bold">{item.label}</div>
                                        <div className="text-[11px] font-medium opacity-60 hidden lg:block">{item.desc}</div>
                                    </div>
                                </div>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute inset-0 bg-white/10 border border-white/10 rounded-2xl -z-10"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Right Content */}
                <div className="lg:col-span-3">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl"
                        >
                            {/* PROFILE TAB */}
                            {activeTab === 'profile' && (
                                <div>
                                    <div className="p-6 sm:p-8 flex items-center gap-3 border-b border-white/5 bg-white/[0.02]">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Profile Information</h2>
                                            <p className="text-xs text-zinc-400 font-medium mt-0.5">Update your personal details</p>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8 space-y-8">
                                        <div className="space-y-2 max-w-lg">
                                            <label className="text-sm font-bold text-zinc-300">Registered Phone</label>
                                            <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-zinc-400">
                                                <Smartphone size={18} className="text-zinc-500" />
                                                <span className="font-mono text-base tracking-wider">{user ? maskPhone(user.phone || user.user_metadata?.display_identifier || user.email?.replace('@pesaki.com', '')) : 'Loading...'}</span>
                                                <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 size={12} />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest">Verified</span>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-zinc-500 font-medium">This is your primary login and M-Pesa ID. It cannot be changed manually.</p>
                                        </div>

                                        <div className="space-y-2 max-w-lg">
                                            <label className="text-sm font-bold text-zinc-300">Full Name</label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Enter your full name"
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                            />
                                        </div>

                                        <div className="pt-4 border-t border-white/5 flex">
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={isSavingProfile}
                                                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold transition-all disabled:opacity-50"
                                            >
                                                <Save size={18} />
                                                {isSavingProfile ? 'Saving...' : 'Save Profile'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECURITY TAB */}
                            {activeTab === 'security' && (
                                <div>
                                    <div className="p-6 sm:p-8 flex items-center gap-3 border-b border-white/5 bg-white/[0.02]">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Security Settings</h2>
                                            <p className="text-xs text-zinc-400 font-medium mt-0.5">Manage your password and authentication</p>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8">
                                        <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-lg">
                                            <div className="space-y-4 bg-black/20 p-6 rounded-3xl border border-white/5">
                                                <div className="flex items-center gap-3 text-white font-bold mb-2">
                                                    <Lock size={16} className="text-zinc-400" />
                                                    Change Password
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">New Password</label>
                                                    <input
                                                        type="password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        placeholder="Enter new password"
                                                        className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        placeholder="Confirm new password"
                                                        className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-medium"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isUpdatingPassword || !newPassword}
                                                    className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50"
                                                >
                                                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* NOTIFICATIONS TAB */}
                            {activeTab === 'notifications' && (
                                <div>
                                    <div className="p-6 sm:p-8 flex items-center gap-3 border-b border-white/5 bg-white/[0.02]">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Notifications</h2>
                                            <p className="text-xs text-zinc-400 font-medium mt-0.5">Control how we communicate with you</p>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8 space-y-4">
                                        {[
                                            { id: 'sms', title: 'SMS Notifications', desc: 'Critical alerts, withdrawals, and security codes.', state: smsNotifs, setter: setSmsNotifs, icon: MessageSquare },
                                            { id: 'email', title: 'Email Updates', desc: 'Newsletters, weekly summaries, and account statement.', state: emailNotifs, setter: setEmailNotifs, icon: Mail },
                                            { id: 'promo', title: 'Promotions & Offers', desc: 'Get notified about free spins and bonus drops.', state: promoNotifs, setter: setPromoNotifs, icon: Info }
                                        ].map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-5 bg-black/20 border border-white/5 rounded-2xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                                                        <item.icon size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white">{item.title}</div>
                                                        <div className="text-xs text-zinc-500 mt-0.5">{item.desc}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        item.setter(!item.state)
                                                        toast.success(`${item.title} ${!item.state ? 'enabled' : 'disabled'}`)
                                                    }}
                                                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${item.state ? 'bg-primary' : 'bg-zinc-700'}`}
                                                >
                                                    <motion.div
                                                        layout
                                                        className={`w-4 h-4 rounded-full bg-white absolute top-1 ${item.state ? 'right-1' : 'left-1'}`}
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* RESPONSIBLE GAMING TAB */}
                            {activeTab === 'gaming' && (
                                <div>
                                    <div className="p-6 sm:p-8 flex items-center gap-3 border-b border-white/5 bg-white/[0.02]">
                                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Responsible </h2>
                                            <p className="text-xs text-zinc-400 font-medium mt-0.5">Tools to help you trade safely</p>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8 space-y-6">
                                        <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <LogOut className="text-red-500" size={24} />
                                                <h3 className="text-base font-bold text-red-500">Self-Exclusion</h3>
                                            </div>
                                            <p className="text-sm text-red-200/60 leading-relaxed font-medium">
                                                Need a break? You can temporarily or permanently lock your account from trading. During a self-exclusion period, you will not be able to log in, deposit, or place trades.
                                            </p>
                                            <div className="pt-4 flex gap-4">
                                                <button
                                                    onClick={() => toast.error('This requires identity verification. Please contact support.')}
                                                    className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 shadow-none border border-red-500/20 text-red-500 font-bold rounded-2xl transition-colors text-sm"
                                                >
                                                    Initiate Time-out
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                                            <h3 className="text-base font-bold text-white">Deposit Limits</h3>
                                            <p className="text-sm text-zinc-400 leading-relaxed">
                                                Set a limit on how much you can deposit within a 24-hour, 7-day, or 30-day period. This helps manage your bankroll safely.
                                            </p>
                                            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-colors text-sm">
                                                Set Deposit Limit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* HELP & SUPPORT TAB */}
                            {activeTab === 'help' && (
                                <div>
                                    <div className="p-6 sm:p-8 flex items-center gap-3 border-b border-white/5 bg-white/[0.02]">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                                            <HelpCircle size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Help & Support</h2>
                                            <p className="text-xs text-zinc-400 font-medium mt-0.5">Get assistance when you need it</p>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8 space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <a 
                                                href="https://wa.me/254140399389" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-[#25D366]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <MessageSquare size={20} className="text-[#25D366]" />
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-white">Chat</div>
                                                    <div className="text-xs text-zinc-500 mt-1">WhatsApp Support</div>
                                                </div>
                                            </a>
                                            <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <FileText size={20} className="text-zinc-300" />
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-white">Knowledge Base</div>
                                                    <div className="text-xs text-zinc-500 mt-1">FAQ & Guides</div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Frequently Asked Questions</h3>
                                            <div className="space-y-2">
                                                {[
                                                    { q: 'How long do withdrawals take?', a: 'Withdrawals via M-Pesa are typically processed instantly, but can occasionally take up to 24 hours depending on network congestion.' },
                                                    { q: 'Can I change my phone number?', a: 'Once registered, your phone number cannot be changed directly via the site. Please contact customer support with identity verification to update your number.' },
                                                    { q: 'What is demo mode?', a: 'Demo mode gives you virtual funds so you can practice your strategies risk-free before switching to Real money.' }
                                                ].map((faq, i) => (
                                                    <details key={i} className="group bg-black/20 border border-white/5 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                                        <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-white hover:bg-white/5 transition-colors">
                                                            <span>{faq.q}</span>
                                                            <ChevronDown size={18} className="text-zinc-500 group-open:rotate-180 transition-transform" />
                                                        </summary>
                                                        <div className="p-5 pt-0 text-sm text-zinc-400 bg-black/20 font-medium leading-relaxed">
                                                            {faq.a}
                                                        </div>
                                                    </details>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
