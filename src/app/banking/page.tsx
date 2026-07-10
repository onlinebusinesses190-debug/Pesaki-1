import { createFileRoute } from "@tanstack/react-router";
import {
  Landmark,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Building2,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/banking-hub")({
  head: () => ({
    meta: [
      { title: "Banking Hub — KAZI" },
      { name: "description", content: "Linked accounts, cards and transfers in your KAZI Banking Hub." },
    ],
  }),
  component: BankingHub,
});

const accounts = [
  { name: "Equity Bank", number: "•••• 4821", type: "Checking", balance: "$8,210.00", icon: Building2 },
  { name: "M-Pesa", number: "+254 •• 4567", type: "Mobile money", balance: "$640.50", icon: Smartphone },
  { name: "Visa Platinum", number: "•••• 9032", type: "Credit card", balance: "$2,000 limit", icon: CreditCard },
];

const transfers = [
  { name: "Bank deposit", date: "Today, 09:12", amount: "+$1,500.00", up: true },
  { name: "Withdrawal to Equity", date: "Yesterday", amount: "-$800.00", up: false },
  { name: "M-Pesa top-up", date: "2 days ago", amount: "+$200.00", up: true },
  { name: "Card payment", date: "3 days ago", amount: "-$120.00", up: false },
];

function BankingHub() {
  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Banking Hub"
        title="Banking & transfers"
        description="Link bank accounts, cards and mobile money, then move funds in and out securely."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Link account
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.name} className="border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <a.icon className="h-5 w-5" />
              </span>
              <Badge variant="secondary">{a.type}</Badge>
            </div>
            <h3 className="mt-4 font-display font-semibold text-foreground">{a.name}</h3>
            <p className="font-mono text-sm text-muted-foreground">{a.number}</p>
            <p className="mt-3 font-display text-xl font-bold text-foreground">{a.balance}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 border-border bg-card p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/15 text-success">
            <ArrowDownLeft className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-foreground">Deposit</h3>
            <p className="text-sm text-muted-foreground">Fund your wallet from any linked source.</p>
          </div>
          <Button variant="secondary">Deposit</Button>
        </Card>
        <Card className="flex items-center gap-4 border-border bg-card p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ArrowUpRight className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-foreground">Withdraw</h3>
            <p className="text-sm text-muted-foreground">Send funds back to your bank or wallet.</p>
          </div>
          <Button variant="secondary">Withdraw</Button>
        </Card>
      </div>

      <Card className="border-border bg-card p-0">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-display text-lg font-bold text-foreground">Recent transfers</h2>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Bank-grade security
          </span>
        </div>
        <div className="divide-y divide-border">
          {transfers.map((t) => (
            <div key={t.name} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    t.up ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t.up ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${t.up ? "text-up" : "text-foreground"}`}>
                {t.amount}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
