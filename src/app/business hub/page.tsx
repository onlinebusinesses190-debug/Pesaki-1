import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  FileText,
  Package,
  Receipt,
  TrendingUp,
  Users,
  ArrowUpRight,
  Plus,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/business-hub")({
  head: () => ({
    meta: [
      { title: "Business Hub — KAZI" },
      { name: "description", content: "Manage products, invoices and business payouts on KAZI." },
    ],
  }),
  component: BusinessHub,
});

const metrics = [
  { label: "Revenue (30d)", value: "$48,920", change: "+12.4%", icon: TrendingUp },
  { label: "Invoices paid", value: "126", change: "+8", icon: Receipt },
  { label: "Active products", value: "34", change: "+3", icon: Package },
  { label: "Customers", value: "1,204", change: "+96", icon: Users },
];

const tools = [
  { name: "Invoicing", desc: "Create and send branded invoices.", icon: FileText },
  { name: "Products", desc: "Manage your catalog and pricing.", icon: Package },
  { name: "Payouts", desc: "Settle revenue to your bank or wallet.", icon: Briefcase },
  { name: "Customers", desc: "Track buyers and their history.", icon: Users },
];

const invoices = [
  { id: "INV-2041", client: "Toto Logistics", amount: "$2,400", status: "Paid" },
  { id: "INV-2040", client: "Mara Foods", amount: "$960", status: "Pending" },
  { id: "INV-2039", client: "Nyota Tech", amount: "$5,150", status: "Paid" },
  { id: "INV-2038", client: "Safari Tours", amount: "$1,280", status: "Overdue" },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  Paid: "default",
  Pending: "secondary",
  Overdue: "destructive",
};

function BusinessHub() {
  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Business Hub"
        title="Run your business"
        description="Invoicing, products, customers and payouts — your commercial command center."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <m.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{m.value}</p>
            <p className="mt-1 text-xs font-medium text-up">{m.change}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map((t) => (
          <Card
            key={t.name}
            className="group cursor-pointer border-border bg-card p-5 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <t.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <h3 className="mt-4 font-display font-semibold text-foreground">{t.name}</h3>
            <p className="text-sm text-muted-foreground">{t.desc}</p>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card p-0">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-display text-lg font-bold text-foreground">Recent invoices</h2>
          <Button variant="ghost" size="sm">
            View all
          </Button>
        </div>
        <div className="divide-y divide-border">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-mono text-sm font-medium text-foreground">{inv.id}</p>
                <p className="text-xs text-muted-foreground">{inv.client}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-foreground">{inv.amount}</span>
                <Badge variant={statusVariant[inv.status]} className="w-20 justify-center">
                  {inv.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
