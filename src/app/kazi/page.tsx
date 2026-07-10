import { createFileRoute } from "@tanstack/react-router";
import { Copy, Gift, Share2, Users, Wallet, Check } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/kazi-link")({
  head: () => ({
    meta: [
      { title: "KAZI Link — Refer & Earn" },
      { name: "description", content: "Share your KAZI Link, invite traders and earn commission." },
    ],
  }),
  component: KaziLink,
});

const stats = [
  { label: "Total referrals", value: "48", icon: Users },
  { label: "Commission earned", value: "$1,920.00", icon: Wallet },
  { label: "Pending rewards", value: "$240.00", icon: Gift },
];

const referrals = [
  { name: "Amani O.", joined: "2 days ago", status: "Active", earned: "$60.00" },
  { name: "Brian K.", joined: "5 days ago", status: "Active", earned: "$45.00" },
  { name: "Zawadi M.", joined: "1 week ago", status: "Pending", earned: "$0.00" },
  { name: "Juma D.", joined: "2 weeks ago", status: "Active", earned: "$120.00" },
];

function KaziLink() {
  const [copied, setCopied] = useState(false);
  const link = "https://kazi.app/r/your-code";

  const copy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="KAZI Link"
        title="Refer & earn"
        description="Invite traders to KAZI and earn a share of their trading activity, for life."
      />

      <Card className="overflow-hidden border-border bg-gradient-to-br from-primary/15 to-transparent p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Your referral link</p>
            <p className="text-xs text-muted-foreground">Earn up to 25% lifetime commission.</p>
          </div>
          <div className="flex w-full max-w-md gap-2">
            <Input readOnly value={link} className="bg-card font-mono text-sm" />
            <Button onClick={copy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="secondary" size="icon" className="shrink-0">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card p-0">
        <div className="border-b border-border p-5">
          <h2 className="font-display text-lg font-bold text-foreground">Your referrals</h2>
        </div>
        <div className="divide-y divide-border">
          {referrals.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-foreground">
                    {r.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Joined {r.joined}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={r.status === "Active" ? "default" : "secondary"}>{r.status}</Badge>
                <span className="w-20 text-right text-sm font-semibold text-up">{r.earned}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
