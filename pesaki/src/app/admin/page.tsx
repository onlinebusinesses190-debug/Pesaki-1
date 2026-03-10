'use client'

import { useState } from 'react'
import { Save, RefreshCw, AlertTriangle, PlayCircle, PauseCircle } from 'lucide-react'

export default function AdminDashboard() {
    const [rtp, setRtp] = useState('92')
    const [companies, setCompanies] = useState([
        { name: 'Safaricom', result: 'PENDING' },
        { name: 'Equity Group', result: 'PENDING' },
        { name: 'KCB Group', result: 'PENDING' }
    ])

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Main Control Panel</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profit Overview */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h3 className="text-zinc-400 text-sm mb-2">Total House Profit (Today)</h3>
                    <div className="text-4xl font-bold text-green-500 flex items-baseline gap-2">
                        KSh 45,290 <span className="text-sm font-normal text-zinc-500">+12%</span>
                    </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h3 className="text-zinc-400 text-sm mb-2">Active Users (Real-Time)</h3>
                    <div className="text-4xl font-bold text-blue-500">128</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h3 className="text-zinc-400 text-sm mb-2">Pending Withdrawals</h3>
                    <div className="text-4xl font-bold text-orange-500">4</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Game Control (RTP) */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <SettingsIcon /> Game Logic Engine
                        </h3>
                        <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded">ACTIVE</span>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400">Global RTP (Return to Player) %</label>
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    value={rtp}
                                    onChange={(e) => setRtp(e.target.value)}
                                    className="bg-black border border-zinc-700 rounded-lg px-4 py-2 w-full font-bold"
                                />
                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold flex items-center gap-2">
                                    <Save size={18} /> Save
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500">
                                Setting lower RTP increases House Edge. Current Edge: {100 - parseInt(rtp)}%
                            </p>
                        </div>

                        <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg space-y-3">
                            <h4 className="font-bold text-red-500 flex items-center gap-2">
                                <AlertTriangle size={16} /> Emergeny Controls
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded">
                                    FREEZE ALL GAMES
                                </button>
                                <button className="py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded">
                                    RESET SERVER
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Investment Results Manager */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">NSE Results Manager</h3>
                        <button className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300">
                            <RefreshCw size={12} /> Sync
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-12 text-sm text-zinc-500 mb-2 px-2">
                            <div className="col-span-6">Company</div>
                            <div className="col-span-6">Result Set</div>
                        </div>
                        {companies.map((c, i) => (
                            <div key={i} className="grid grid-cols-12 items-center bg-black/40 p-3 rounded-lg border border-white/5">
                                <div className="col-span-6 font-medium">{c.name}</div>
                                <div className="col-span-6 flex gap-2">
                                    <button className="flex-1 py-1 bg-green-500/20 text-green-500 border border-green-500/30 rounded hover:bg-green-500/30 text-xs font-bold">
                                        HIGH
                                    </button>
                                    <button className="flex-1 py-1 bg-red-500/20 text-red-500 border border-red-500/30 rounded hover:bg-red-500/30 text-xs font-bold">
                                        LOW
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 font-bold rounded-lg border border-zinc-700">
                        PUBLISH DAILY RESULTS
                    </button>
                </div>
            </div>
        </div>
    )
}

function SettingsIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
}
