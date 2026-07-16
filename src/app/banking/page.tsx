"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Target, PiggyBank, Plus, ArrowDownToLine, ArrowUpFromLine,
  TrendingUp, HandCoins, Lock, Info, CheckCircle2, ShieldCheck, Calendar, X, ArrowLeft,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/Appshell";
import { Card, Stat, SectionTitle, Progress, Badge } from "@/components/ui-bits";
import { savingsGoals, fmt } from "@/lib/mock";
import { balanceStore, useBalance, totalLocked } from "@/lib/balance";

type ActionKey = "deposit" | "withdraw" | "invest" | "loan";

const actions: { key: ActionKey; label: string; icon: any; tone: string }[] = [
  { key: "deposit",  label: "Deposit",  icon: ArrowDownToLine, tone: "bg-success/15 text-success" },
  { key: "withdraw", label: "Withdraw", icon: ArrowUpFromLine, tone: "bg-primary/10 text-primary" },
  { key: "invest",   label: "Invest",   icon: TrendingUp,      tone: "bg-gold/15 text-gold-foreground" },
  { key: "loan",     label: "Loan",     icon: HandCoins,       tone: "bg-muted text-foreground" },
];

const durations = [
  { months: 3,  apy: 4,  label: "3 months",  hint: "Flexible" },
  { months: 6,  apy: 6,  label: "6 months",  hint: "Balanced" },
  { months: 12, apy: 8,  label: "12 months", hint: "Popular", featured: true },
  { months: 24, apy: 10, label: "24 months", hint: "Best rate" },
];

export default function BankingPage() {
  const [modal, setModal] = useState<ActionKey | null>(null);
  const [amount, setAmount] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(2);
  const state = useBalance();
  const locked = totalLocked(state);

  const handleLock = () => {
    if (!amount) return;
    const dur = durations[selectedDuration];
    const result = balanceStore.lock(`${dur.label} Lock`, Number(amount), dur.months, dur.apy);
    if (result.ok) {
      setAmount("");
      setModal(null);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Banking Hub" subtitle="Your PESAKI bank" right={<Badge tone="success"><ShieldCheck className="h-2.5 w-2.5" /> Insured</Badge>} />

      {/* Balance Card */}
      <section className="px-5 pt-5">
        <div className="relative overflow-hidden rounded-2xl gradient-primary p-5 text-primary-foreground">
          <PiggyBank className="absolute -right-3 -top-3 h-28 w-28 opacity-15" />
          <p className="text-xs uppercase tracking-widest opacity-80">Total Savings</p>
          <p className="mt-1 font-display text-3xl font-bold">{fmt(state.available + locked)}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="opacity-70">Available</p>
              <p className="mt-0.5 font-semibold">{fmt(state.available)}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="opacity-70">Locked</p>
              <p className="mt-0.5 font-semibold">{fmt(locked)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mt-6 px-5">
        <SectionTitle title="Actions" />
        <Card className="grid grid-cols-2 gap-3 !p-3">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => setModal(a.key)}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-muted ${a.tone}`}
            >
              <a.icon className="h-5 w-5" />
              <span className="text-[11px] font-semibold">{a.label}</span>
            </button>
          ))}
        </Card>
      </section>

      {/* Savings Goals */}
      <section className="mt-6 px-5 pb-24">
        <SectionTitle title="Savings Goals" />
        <div className="space-y-3">
          {savingsGoals.map((goal) => {
            const percent = (goal.saved / goal.target) * 100;
            return (
              <Card key={goal.name} className="!p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmt(goal.saved)} of {fmt(goal.target)}</p>
                  </div>
                  <Badge tone="gold">{goal.apy} APY</Badge>
                </div>
                <Progress value={percent} />
                <p className="mt-2 text-xs text-muted-foreground text-right">{Math.round(percent)}%</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Invest Modal */}
      {modal === "invest" && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-in">
          <div className="w-full rounded-t-3xl bg-card p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Lock Funds</h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {durations.map((d, i) => (
                    <button
                      key={d.label}
                      onClick={() => setSelectedDuration(i)}
                      className={`rounded-lg p-3 text-xs font-semibold transition-all ${
                        selectedDuration === i
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-muted text-foreground hover:bg-border"
                      }`}
                    >
                      <div>{d.label}</div>
                      <div className="opacity-70">{d.apy}% APY</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                <p className="text-muted-foreground">Estimated Returns:</p>
                <p className="font-bold text-success">
                  +{Math.round(Number(amount || 0) * (durations[selectedDuration].apy / 100))}
                </p>
              </div>
            </div>

            <button
              onClick={handleLock}
              disabled={!amount}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Lock & Start Earning
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
