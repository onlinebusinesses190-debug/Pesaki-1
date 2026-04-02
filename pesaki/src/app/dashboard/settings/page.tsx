'use client'

import { useState, useEffect } from 'react'
import { User, Shield, Bell, HelpCircle, Lock, Smartphone, ChevronRight, Save, Info, AlertTriangle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'

export default function SettingsPage() {
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode') || 'demo'
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [fullName, setFullName] = useState('')

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                
                if (profile) {
                    setProfile(profile)
                    setFullName(profile.full_name || '')
                }
            }
        }
        fetchUser()
    }, [])

    const handleSaveProfile = async () => {
        setIsSaving(true)
        setMessage('')
        const supabase = createClient()
        
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user.id)
        
        if (error) {
            setMessage('Failed to update profile.')
        } else {
            setMessage('Profile updated successfully!')
        }
        setIsSaving(false)
    }

    const maskPhone = (phone: string) => {
        if (!phone) return ''
        return phone.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2')
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-zinc-400 mt-1">Manage your account, security, and preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Sidebar - Navigation Labels */}
                <div className="space-y-1">
                    {[
                        { id: 'profile', label: 'Profile', icon: User },
                        { id: 'security', label: 'Security', icon: Shield },
                        { id: 'notifications', label: 'Notifications', icon: Bell },
                        { id: 'gaming', label: 'Responsible Gaming', icon: Info },
                        { id: 'help', label: 'Help & Support', icon: HelpCircle },
                    ].map((item) => (
                        <button
                            key={item.id}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group hover:bg-white/5 text-zinc-400 hover:text-white"
                        >
                            <item.icon size={18} className="group-hover:text-primary transition-colors" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Right Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Profile Section */}
                    <section className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-border bg-white/[0.02]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <User size={20} className="text-primary" /> Profile Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Registered Phone</label>
                                <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-zinc-500">
                                    <Smartphone size={18} />
                                    <span className="font-mono">{user?.phone ? maskPhone(user.phone) : 'Loading...'}</span>
                                    <span className="ml-auto text-[10px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Verified</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 italic">This is your primary login and M-Pesa ID. Contact support to change it.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                />
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                <Save size={18} />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                            {message && <p className="text-xs text-emerald-400 font-medium">{message}</p>}
                        </div>
                    </section>

                    {/* Security Section */}
                    <section className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-border bg-white/[0.02]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Shield size={20} className="text-amber-500" /> Security
                            </h2>
                        </div>
                        <div className="p-6">
                            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-all text-left">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                        <Lock size={18} className="text-zinc-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">Password</div>
                                        <div className="text-xs text-zinc-500">Last changed 3 months ago</div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-zinc-600" />
                            </button>
                        </div>
                    </section>

                    {/* Responsible Gaming */}
                    <section className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-border bg-white/[0.02]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle size={20} className="text-red-500" /> Responsible Gaming
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 space-y-3">
                                <h3 className="text-sm font-bold text-red-500">Self-Exclusion</h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Need a break? Temporarily lock your account from betting for a specific duration. During this time, you will not be able to log in or place bets.
                                </p>
                                <button className="text-xs font-bold text-red-600 hover:text-red-500 transition-colors">
                                    ACTIVATE SELF-EXCLUSION
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
