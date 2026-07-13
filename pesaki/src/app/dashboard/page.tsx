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
  Home,
  BarChart2,
  Briefcase,
  Building2,
  Landmark,
  Wallet,
  User,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";

const fmt = (amount: number) => `KES ${amount?.toLocaleString() ?? 0}`;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // --- FETCH YOUR REAL DATA ---
  let balance = 0;
  let totalEarnings = 0;
  let referralEarnings = 0;

  if (user) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, total_earnings, referral_earnings')
      .eq('user_id', user.id)
      .single();
    if (wallet) {
      balance = wallet.balance || 0;
      totalEarnings = wallet.total_earnings || 0;
      referralEarnings = wallet.referral_earnings || 0;
    }
  }

  let recentTransactions: { id: string; type: string; date: string; status: string; amount: number }[] = [];

  if (user) {
    const { data: txs } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (txs) {
      recentTransactions = txs.map((t: any) => ({
        id: t.id,
        type: t.type,
        date: new Date(t.created_at).toLocaleDateString(),
        status: t.status,
        amount: t.amount,
      }));
    }
  }

  const stats = [
    { label: "Active Trades", value: "12", trend: "+3" },
    { label: "Jobs Completed", value: "47", trend: "+5" },
    { label: "Investment Growth", value: "+18.4%", trend: "YTD" },
    { label: "Businesses Funded", value: "3", trend: "Active" },
  ];

  const opportunities = [
    { category: "KAZI LINK", title: "Senior House Help — Karen", pay: "KES 25,000/mo", tag: "New" },
    { category: "FUNDING", title: "Agritech Startup — Series Seed", pay: "Up to KES 2M", tag: "Hot" },
    { category: "ANNOUNCEMENT", title: "PESAKI Savings 12% APY", pay: "Limited time", tag: "Featured" },
    { category: "KAZI LINK", title: "Event Workers — Nairobi Expo", pay: "KES 3,500/day", tag: "Urgent" },
  ];

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Guest";

  // Navigation items matching your mockup
  const navItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Trading", icon: BarChart2, href: "/trading" },
    { label: "KAZI", icon: Briefcase, href: "/kazi" },
    { label: "Business", icon: Building2, href: "/business" },
    { label: "Banking", icon: Landmark, href: "/banking" },
    { label: "Wallet", icon: Wallet, href: "/wallet" },
    { label: "Profile", icon: User, href: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">

      {/* Hero Section - WHITE + GREEN (Exactly Like Mockup) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-gray-50 px-5 pb-8 pt-6">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-green-200/30 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs/4 text-gray-500">Welcome{user ? " back" : ""},</p>
            <h1 className="truncate text-2xl font-bold text-gray-900">{displayName} 👋</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-full bg-gray-100">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
            {user ? (
              <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-green-600 font-bold text-white">
                {(displayName[0] ?? "P").toUpperCase()}
              </Link>
            ) : (
              <Link href="/login" className="flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Balance Card - White with Green Accent */}
        <div className="relative mt-6 rounded-3xl bg-white p-5 shadow-lg ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-gray-500">Available Balance</p>
            <EyeOff className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight text-gray-900">
            {fmt(balance)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-green-50 p-2.5">
              <p className="text-gray-500">Total Earnings</p>
              <p className="mt-0.5 font-semibold text-gray-900">{fmt(totalEarnings)}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-2.5">
              <p className="text-gray-500">Referral Earnings</p>
              <p className="mt-0.5 font-semibold text-gray-900">{fmt(referralEarnings)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions - White Cards with Green Icons */}
      <section className="-mt-5 px-5">
        <div className="grid grid-cols-4 gap-2 rounded-xl bg-white p-3 shadow-lg">
          {[
            { label: "Deposit", icon: ArrowDownToLine, href: "/wallet" },
            { label: "Withdraw", icon: ArrowUpFromLine, href: "/wallet" },
            { label: "Transfer", icon: ArrowLeftRight, href: "/wallet" },
            { label: "Trading", icon: LineChart, href: "/trading" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-green-50"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-green-100 text-green-700">
                <a.icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium text-gray-700">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats - White Cards */}
      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white p-3 shadow-md">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-green-600">{s.trend}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Promo Banner - Green Gradient */}
      <section className="mt-6 px-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 to-green-700 p-5 text-white">
          <Sparkles className="absolute -right-2 -top-2 h-24 w-24 opacity-20" />
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Featured</p>
          <h3 className="mt-1 max-w-[80%] text-lg font-bold leading-snug">
            Grow your savings at 12% APY
          </h3>
          <p className="mt-1 max-w-[85%] text-xs opacity-80">
            Lock funds for 90 days and earn premium interest.
          </p>
          <Link
            href="/banking"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-green-700"
          >
            Start saving <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Opportunities - White Cards */}
      <section className="mt-7 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Latest opportunities</h2>
          <Link href="/kazi" className="text-xs font-semibold text-green-600">See all</Link>
        </div>
        <div className="mt-2 space-y-2.5">
          {opportunities.map((o) => (
            <div key={o.title} className="rounded-xl bg-white p-3.5 shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{o.category}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{o.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{o.pay}</p>
                </div>
                <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  {o.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transactions - White Card */}
      <section className="mt-7 px-5 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent transactions</h2>
          <Link href="/wallet" className="text-xs font-semibold text-green-600">View wallet</Link>
        </div>
        <div className="mt-2 rounded-xl bg-white p-2 shadow-md">
          <ul className="divide-y divide-gray-100">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => {
                const positive = t.amount > 0;
                return (
                  <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${positive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        <TrendingUp className={`h-4 w-4 ${positive ? "" : "rotate-180"}`} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{t.type}</p>
                        <p className="truncate text-[11px] text-gray-500">{t.date} · {t.status}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold ${positive ? "text-green-700" : "text-gray-900"}`}>
                      {positive ? "+" : ""}{fmt(t.amount).replace("KES ", "")}
                    </p>
                  </li>
                );
              })
            ) : (
              <li className="px-2 py-6 text-center text-sm text-gray-500">
                No recent transactions
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ✅ BOTTOM NAVIGATION - White + Green (Exact Mockup Look) */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-7 h-16">
          {navItems.map((item) => {
            const isActive = item.href === "/"; // Home is active for this page
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  isActive ? "text-green-600" : "text-gray-400 hover:text-gray-900"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-green-600" : ""}`} />
                <span className={`text-[10px] ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
