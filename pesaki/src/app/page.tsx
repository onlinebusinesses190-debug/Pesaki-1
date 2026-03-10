import Link from "next/link";
import { ArrowRight, Trophy, Zap, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, redirect to mode selection or dashboard
  if (user) {
    redirect('/mode-selection');
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-white">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <span className="bg-primary px-2 py-0.5 rounded text-white">P</span>
            PESAKI
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Login
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-zinc-200 transition-all hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-24 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            The ultimate skill-based gaming platform
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
            PLAY GAMES.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-500 to-blue-500">
              WIN REAL MONEY.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-400 mb-12 leading-relaxed">
            Experience the thrill of Forex trading, crash games, and stock market predictions
            in a safe, verified, and high-speed environment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-black text-lg rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Start Playing Now <ArrowRight size={20} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-bold text-lg rounded-2xl hover:bg-white/10 transition-all"
            >
              View Games
            </Link>
          </div>

          {/* Social Proof / Stats */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/5 pt-16">
            <div className="text-center">
              <div className="text-3xl font-black mb-1">KSh 1.2M+</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Total Paid Out</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black mb-1">50k+</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black mb-1">1 sec</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Instant Payouts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black mb-1">24/7</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Support Ready</div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="bg-zinc-950/50 py-32 border-y border-white/5">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Zap size={28} />
                </div>
                <h3 className="text-2xl font-bold">Lightning Fast</h3>
                <p className="text-zinc-400">Experience low-latency gameplay with real-time market updates and instant win notifications.</p>
              </div>
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-2xl font-bold">Secure Wallet</h3>
                <p className="text-zinc-400">Your funds are protected with bank-grade security and integrated with M-Pesa for safe transactions.</p>
              </div>
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Trophy size={28} />
                </div>
                <h3 className="text-2xl font-bold">Fair Play</h3>
                <p className="text-zinc-400">All games follow transparent rules with verifiable outcomes, giving everyone a fair chance to win.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-white/5">
        <div className="container mx-auto px-6 text-center text-zinc-500 text-sm">
          &copy; 2026 Pesaki Platform. All rights reserved. 18+ Play Responsibly.
        </div>
      </footer>
    </div>
  );
}
