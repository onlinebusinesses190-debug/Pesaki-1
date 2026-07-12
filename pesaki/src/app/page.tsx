import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  LineChart,
  Bell,
  Eye,
  EyeOff,
  TrendingUp,
  ChevronRight,
  Sparkles,
  LogIn,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Helper to format currency
const fmt = (amount: number) => `KES ${amount?.toLocaleString() ?? 0}`;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // --- FETCH YOUR REAL DATA FROM SUPABASE ---
  // 1. Fetch Wallet Balance
  let balance = 0;
  let totalEarnings = 0;
  let referralEarnings = 0;
  if (user) {
    const { data: wallet } = await supabase
      .from('wallets') // 🔥 CHANGE THIS to your actual table name (e.g., 'balances', 'user_data')
      .select('balance, total_earnings, referral_earnings')
      .eq('user_id', user.id)
      .single();
    
    if (wallet) {
      balance = wallet.balance || 0;
      totalEarnings = wallet.total_earnings || 0;
      referralEarnings = wallet.referral_earnings || 0;
    }
  }

  // 2. Fetch Recent Transactions (Top 5)
  let recentTransactions = [];
  if (user) {
    const { data: txs } = await supabase
      .from('transactions') // 🔥 CHANGE THIS to your actual table name
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (txs) {
      recentTransactions = txs.map(t => ({
        id: t.id,
        type: t.type, // e.g., 'Deposit', 'Withdrawal'
        date: new Date(t.created_at).toLocaleDateString(),
        status: t.status, // e.g., 'Completed', 'Pending'
        amount: t.amount,
      }));
    }
  }

  // 3. Stats (These usually come from a separate stats table or aggregation)
  // For now, keep them as static or fetch from a user_stats table
  const stats = [
    { label: "Active Trades", value: "12", trend: "+3", tone: "success" },
    { label: "Jobs Completed", value: "47", trend: "+5", tone: "success" },
    { label: "Investment Growth", value: "+18.4%", trend: "YTD", tone: "gold" },
    { label: "Businesses Funded", value: "3", trend: "Active", tone: "warning" },
  ];

  // Opportunities (You can fetch these from a 'jobs' or 'opportunities' table later)
  const opportunities = [
    { category: "KAZI LINK", title: "Senior House Help — Karen", pay: "KES 25,000/mo", tag: "New" },
    { category: "FUNDING", title: "Agritech Startup — Series Seed", pay: "Up to KES 2M", tag: "Hot" },
    { category: "ANNOUNCEMENT", title: "PESAKI Savings 12% APY", pay: "Limited time", tag: "Featured" },
    { category: "KAZI LINK", title: "Event Workers — Nairobi Expo", pay: "KES 3,500/day", tag: "Urgent" },
  ];

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Guest";

  // ------------------------------------------------
  // 🚀 YOUR UI RENDER (Using YOUR real data)
  // ------------------------------------------------
  return (
    <div className="min-h-screen bg-black text-white">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-800 to-black px-5 pb-8 pt-6 text-white">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-yellow-500/20 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs/4 opacity-80">Welcome{user ? " back" : ""},</p>
            <h1 className="truncate text-2xl font-bold">{displayName} 👋</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur">
              <Bell className="h-5 w-5" />
            </button>
            {user ? (
              <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-yellow-500 font-bold text-black">
                {(displayName[0] ?? "P").toUpperCase()}
              </Link>
            ) : (
              <Link href="/login" className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="relative mt-6 rounded-3xl bg-white/10 p-5 backdrop-blur-md ring-1 ring-white/15">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider opacity-80">Available Balance</p>
            {/* Show/Hide toggle works, but you need to handle state on client. For simplicity, showing always here */}
            <EyeOff className="h-4 w-4 opacity-80" /> 
          </div>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight">
            {fmt(balance)} {/* 👈 YOUR REAL BALANCE (KES 17,000) */}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="opacity-70">Total Earnings</p>
              <p className="mt-0.5 font-semibold">{fmt(totalEarnings)}</p> {/* 👈 YOUR REAL EARNINGS */}
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="opacity-70">Referral Earnings</p>
              <p className="mt-0.5 font-semibold">{fmt(referralEarnings)}</p> {/* 👈 YOUR REAL REFERRALS */}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="-mt-5 px-5">
        <Card className="grid grid-cols-4 gap-2 border-0 bg-zinc-900/50 p-3 shadow-xl backdrop-blur">
          {[
            { label: "Deposit", icon: ArrowDownToLine, href: "/wallet" },
            { label: "Withdraw", icon: ArrowUpFromLine, href: "/wallet" },
            { label: "Transfer", icon: ArrowLeftRight, href: "/wallet" },
            { label: "Trading", icon: LineChart, href: "/trading" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-white/5"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <a.icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium">{a.label}</span>
            </Link>
          ))}
        </Card>
      </section>

      {/* Stats Grid */}
      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="border-0 bg-zinc-900/50 p-3">
              <p className="text-xs text-zinc-400">{s.label}</p>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-emerald-400">{s.trend}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Promo Banner */}
      <section className="mt-6 px-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-600 p-5 text-black">
          <Sparkles className="absolute -right-2 -top-2 h-24 w-24 opacity-20" />
          <p className="text-[11px] font-semibold uppercase tracking-wider">Featured</p>
          <h3 className="mt-1 max-w-[80%] text-lg font-bold leading-snug">
            Grow your savings at 12% APY
          </h3>
          <p className="mt-1 max-w-[85%] text-xs opacity-80">
            Lock funds for 90 days and earn premium interest.
          </p>
          <Link
            href="/banking"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-black px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            Start saving <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Opportunities */}
      <section className="mt-7 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Latest opportunities</h2>
          <Link href="/kazi" className="text-xs font-semibold text-yellow-500">See all</Link>
        </div>
        <div className="mt-2 space-y-2.5">
          {opportunities.map((o) => (
            <Card key={o.title} className="border-0 bg-zinc-900/50 !p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{o.category}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-white">{o.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{o.pay}</p>
                </div>
                <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                  {o.tag}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="mt-7 px-5 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Recent transactions</h2>
          <Link href="/wallet" className="text-xs font-semibold text-yellow-500">View wallet</Link>
        </div>
        <Card className="mt-2 border-0 bg-zinc-900/50 !p-2">
          <ul className="divide-y divide-zinc-800">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => {
                const positive = t.amount > 0;
                return (
                  <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${positive ? "bg-emerald-500/15 text-emerald-500" : "bg-zinc-700/50 text-zinc-400"}`}>
                        <TrendingUp className={`h-4 w-4 ${positive ? "" : "rotate-180"}`} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{t.type}</p>
                        <p className="truncate text-[11px] text-zinc-400">{t.date} · {t.status}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold ${positive ? "text-emerald-500" : "text-white"}`}>
                      {positive ? "+" : ""}{fmt(t.amount).replace("KES ", "")}
                    </p>
                  </li>
                );
              })
            ) : (
              <li className="px-2 py-6 text-center text-sm text-zinc-500">
                No recent transactions
              </li>
            )}
          </ul>
        </Card>
      </section>

      <p className="px-5 pb-10 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        PESAKI · Earn. Invest. Grow.
      </p>
    </div>
  );
}
