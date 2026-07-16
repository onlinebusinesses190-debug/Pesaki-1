"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2, FileText, TrendingUp, Award, BookOpen, ChevronRight, X, ArrowLeft,
  Rocket, Store, Calendar, CheckCircle2, Clock,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/Appshell";
import { Card, Stat, SectionTitle, Badge } from "@/components/ui-bits";
import { businessApps, successStories, fmt } from "@/lib/mock";

const sections = [
  { label: "Apply for Funding",  icon: FileText,    tone: "primary", key: "apply" as const },
  { label: "My Applications",    icon: Building2,   tone: "gold",    key: "" as const },
  { label: "My Investments",     icon: TrendingUp,  tone: "success", key: "" as const },
  { label: "Success Stories",    icon: Award,       tone: "gold",    key: "" as const },
  { label: "Funding Guidelines", icon: BookOpen,    tone: "primary", key: "" as const },
];

export default function BusinessPage() {
  const [mode, setMode] = useState<"none" | "picker" | "startup" | "existing">("none");

  return (
    <AppShell>
      <PageHeader title="Business Hub" subtitle="Fund. Build. Scale." />

      {/* Funding Summary */}
      <section className="px-5 pt-5">
        <div className="gradient-primary rounded-2xl p-5 text-primary-foreground">
          <p className="text-xs uppercase tracking-widest opacity-80">Total Funding Received</p>
          <p className="mt-1 font-display text-3xl font-bold">{fmt(730000)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="opacity-70">Amount Repaid</p>
              <p className="mt-0.5 font-semibold">{fmt(142000)}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="opacity-70">Profit Share Paid</p>
              <p className="mt-0.5 font-semibold">{fmt(38500)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-5 grid grid-cols-3 gap-3 px-5">
        <Stat label="Open Apps" value="2" tone="primary" />
        <Stat label="Approved" value="3" tone="success" />
        <Stat label="Repayment" value="On time" tone="gold" />
      </section>

      {/* Quick Actions */}
      <section className="mt-6 px-5">
        <SectionTitle title="Quick actions" />
        <Card className="!p-2">
          <ul className="divide-y divide-border">
            {sections.map((s) => (
              <li key={s.label}>
                <button
                  onClick={() => s.key === "apply" && setMode("picker")}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-bold ${
                      s.tone === "primary" ? "bg-primary/10 text-primary" :
                      s.tone === "gold" ? "bg-gold/15 text-gold-foreground" :
                      "bg-success/15 text-success"
                    }`}>
                      <s.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* My Applications */}
      <section className="mt-6 px-5 pb-24">
        <SectionTitle title="My applications" />
        <div className="space-y-3">
          {businessApps.map((app) => {
            const statusColor = app.status === "Approved" ? "success" :
                               app.status === "Reviewing" ? "warning" : "primary";
            return (
              <Card key={app.name} className="!p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{app.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmt(app.amount)}</p>
                  </div>
                  <Badge tone={statusColor}>{app.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <p className="text-muted-foreground">Repaid: {fmt(app.repaid)}</p>
                  <p className="font-semibold">{Math.round((app.repaid / app.amount) * 100)}%</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Success Stories Modal */}
      {mode === "picker" && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-in">
          <div className="w-full rounded-t-3xl bg-card p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Business Type</h2>
              <button onClick={() => setMode("none")} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setMode("startup")}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Rocket className="h-6 w-6 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Startup Business</p>
                  <p className="text-xs text-muted-foreground">New venture or idea</p>
                </div>
              </button>
              <button
                onClick={() => setMode("existing")}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Store className="h-6 w-6 text-gold-foreground" />
                <div className="text-left">
                  <p className="font-semibold">Existing Business</p>
                  <p className="text-xs text-muted-foreground">Expand or optimize</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
