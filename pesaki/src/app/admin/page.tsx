'use client'

import { useState } from 'react'
import { Save, Trash2, UserPlus, LogOut } from 'lucide-react'

const ADMIN_PHONE = '0704606396'
const ADMIN_PASSWORD = '12345678'

interface AdminUser {
    phone: string
    password: string
}

const initialUsers: AdminUser[] = [
    { phone: ADMIN_PHONE, password: ADMIN_PASSWORD }
]

export default function AdminDashboard() {
    const [loggedIn, setLoggedIn] = useState(false)
    const [loginPhone, setLoginPhone] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    const [loginError, setLoginError] = useState('')

    const [users, setUsers] = useState<AdminUser[]>(initialUsers)
    const [newPhone, setNewPhone] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [editPasswords, setEditPasswords] = useState<Record<string, string>>({})
    const [message, setMessage] = useState('')

    const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (loginPhone === ADMIN_PHONE && loginPassword === ADMIN_PASSWORD) {
            setLoggedIn(true)
            setLoginError('')
            setLoginPhone('')
            setLoginPassword('')
            setMessage('Welcome, admin!')
            return
        }

        setLoginError('Invalid admin credentials. Use phone 0704606396 and password 12345678.')
    }

    const handleLogout = () => {
        setLoggedIn(false)
        setMessage('Logged out successfully.')
    }

    const handleAddUser = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setMessage('')

        const trimmedPhone = newPhone.trim()
        const trimmedPassword = newPassword.trim()

        if (!trimmedPhone || !trimmedPassword) {
            setMessage('Phone and password are required.')
            return
        }

        if (users.some((user) => user.phone === trimmedPhone)) {
            setMessage('A user with that phone number already exists.')
            return
        }

        setUsers([...users, { phone: trimmedPhone, password: trimmedPassword }])
        setNewPhone('')
        setNewPassword('')
        setMessage(`User ${trimmedPhone} added.`)
    }

    const handleDeleteUser = (phone: string) => {
        if (phone === ADMIN_PHONE) {
            setMessage('The admin account cannot be deleted.')
            return
        }
        setUsers(users.filter((user) => user.phone !== phone))
        setMessage(`User ${phone} deleted.`)
    }

    const handlePasswordEdit = (phone: string, password: string) => {
        setEditPasswords({ ...editPasswords, [phone]: password })
    }

    const savePassword = (phone: string) => {
        const newPass = (editPasswords[phone] ?? '').trim()
        if (!newPass) {
            setMessage('Password cannot be empty.')
            return
        }
        setUsers(users.map((user) => user.phone === phone ? { ...user, password: newPass } : user))
        setMessage(`Password updated for ${phone}.`)
    }

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Admin Control Panel</h1>
                    <p className="text-sm text-zinc-400">Only the configured admin can access this page.</p>
                </div>
                {loggedIn && (
                    <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                        <LogOut size={16} /> Logout
                    </button>
                )}
            </header>

            {!loggedIn ? (
                <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl shadow-black/30">
                    <h2 className="text-xl font-semibold mb-4">Admin Sign In</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm text-zinc-400">Phone number</label>
                            <input
                                value={loginPhone}
                                onChange={(e) => setLoginPhone(e.target.value)}
                                placeholder="0704606396"
                                className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-zinc-400">Password</label>
                            <input
                                type="password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="********"
                                className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                            />
                        </div>
                        <button type="submit" className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                            Sign in
                        </button>
                        {loginError && <div className="rounded-2xl bg-red-900/50 p-3 text-sm text-red-300">{loginError}</div>}
                    </form>
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-8">
                        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl shadow-black/20">
                            <h2 className="text-2xl font-semibold mb-4">User Management</h2>
                            <p className="text-sm text-zinc-400 mb-6">
                                Admin account: <span className="font-medium">{ADMIN_PHONE}</span>. The admin account cannot be deleted.
                            </p>

                            <div className="space-y-6">
                                <form onSubmit={handleAddUser} className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm text-zinc-400">Phone</label>
                                        <input
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            placeholder="Enter phone"
                                            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm text-zinc-400">Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter password"
                                            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500">
                                            <UserPlus size={16} /> Add user
                                        </button>
                                    </div>
                                </form>

                                {message && <div className="rounded-2xl bg-blue-900/50 p-4 text-sm text-blue-200">{message}</div>}

                                <div className="space-y-4">
                                    {users.map((user) => (
                                        <div key={user.phone} className="rounded-3xl border border-zinc-800 bg-black/30 p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <div className="text-sm text-zinc-400">Phone</div>
                                                    <div className="font-medium text-white">{user.phone}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteUser(user.phone)}
                                                    className="inline-flex items-center gap-2 rounded-2xl border border-red-700 bg-red-700/10 px-4 py-2 text-sm text-red-200 hover:bg-red-700/20 disabled:cursor-not-allowed"
                                                    disabled={user.phone === ADMIN_PHONE}
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                            <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
                                                <div>
                                                    <label className="mb-2 block text-sm text-zinc-400">Password</label>
                                                    <input
                                                        type="password"
                                                        value={editPasswords[user.phone] ?? user.password}
                                                        onChange={(e) => handlePasswordEdit(user.phone, e.target.value)}
                                                        className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => savePassword(user.phone)}
                                                    className="inline-flex h-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                                                >
                                                    <Save size={16} /> Save
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-6">
                        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl shadow-black/20">
                            <h3 className="text-xl font-semibold mb-3">Admin access</h3>
                            <p className="text-sm text-zinc-400 mb-4">
                                Your admin account is locked to the fixed credentials below. Use this area to manage extra users and update passwords.
                            </p>
                            <div className="rounded-3xl bg-zinc-900/80 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Current admin login</p>
                                <div className="mt-3 space-y-2 text-sm">
                                    <div><span className="font-medium text-white">Phone:</span> {ADMIN_PHONE}</div>
                                    <div><span className="font-medium text-white">Password:</span> {ADMIN_PASSWORD}</div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl shadow-black/20">
                            <h3 className="text-xl font-semibold mb-3">Current user count</h3>
                            <div className="rounded-3xl bg-black/50 p-6 text-center">
                                <div className="text-5xl font-bold text-white">{users.length}</div>
                                <div className="mt-2 text-sm text-zinc-400">managed user accounts</div>
                            </div>
                        </section>
                    </aside>
                </div>
            )}
        </div>
    )
}
