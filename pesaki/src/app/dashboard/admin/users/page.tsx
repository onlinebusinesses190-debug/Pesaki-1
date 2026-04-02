'use client'

import { useState, useEffect } from 'react'
import { 
    Users, 
    Search,
    RefreshCw,
    UserCircle,
    Phone,
    ShieldCheck,
    ArrowUpDown,
    MoreVertical,
    History
} from 'lucide-react'
import { apiRequest } from '@/utils/api'
import { toast } from 'sonner'

interface AdminUser {
    id: string
    full_name: string
    phone: string
    role: string
    created_at: string
    balance?: number
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchUsers = async () => {
        setLoading(true)
        try {
            // We'll create this API next or use a direct Supabase query if simple
            // For now, let's assume we have an endpoint /api/admin/users
            const res = await apiRequest('/api/admin/users')
            setUsers(res.users)
        } catch (err: any) {
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const filteredUsers = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
    )

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Users className="text-primary" />
                        User Directory
                    </h1>
                    <p className="text-zinc-400 mt-1">Manage and audit all registered Pesaki users.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Name or phone..."
                            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={fetchUsers}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* User Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8">
                                            <div className="h-4 bg-white/5 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/[0.01] transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {user.full_name?.slice(0, 1) || '?'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{user.full_name || 'Anonymous User'}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{user.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                                <Phone size={14} className="text-zinc-600" />
                                                {user.phone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                                                user.role === 'admin' 
                                                ? 'bg-primary/20 text-primary border border-primary/30' 
                                                : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="p-2 text-zinc-600 hover:text-white transition-all bg-white/0 hover:bg-white/5 rounded-lg" title="View Wallet History">
                                                    <History size={16} />
                                                </button>
                                                <button className="p-2 text-zinc-600 hover:text-white transition-all bg-white/0 hover:bg-white/5 rounded-lg">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-zinc-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
