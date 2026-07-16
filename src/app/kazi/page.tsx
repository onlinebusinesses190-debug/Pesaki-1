"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, Star, MapPin, Shield, Plus, X, ArrowLeft, Upload, CheckCircle2, Search } from "lucide-react";
import { AppShell, PageHeader } from "@/components/Appshell";
import { Card, Badge, SectionTitle } from "@/components/ui-bits";
import { jobCategories, workers } from "@/lib/mock";

type Job = { t: string; l: string; p: string; b: "Urgent" | "New" | "Hot" };
const jobs: Job[] = [
  { t: "Live-in House Help", l: "Karen, Nairobi", p: "KES 25,000/mo", b: "Urgent" },
  { t: "Evening Tutor (Math)", l: "Kileleshwa", p: "KES 1,200/hr", b: "New" },
  { t: "Event Cleaner", l: "Westlands", p: "KES 1,800/day", b: "Hot" },
];

export default function KaziPage() {
  const [tab, setTab] = useState<"find" | "hire">("find");
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [postJob, setPostJob] = useState(false);

  return (
    <AppShell>
      <PageHeader title="KAZI Link" subtitle="Connecting workers and employers" />

      <div className="px-5 pt-4">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
          {(["find", "hire"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full py-2 text-xs font-semibold transition-all ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "find" ? "Find Work" : "Hire Workers"}
            </button>
          ))}
          <button
            onClick={() => setPostJob(true)}
            className="inline-flex items-center justify-center gap-1 rounded-full gradient-primary py-2 text-xs font-semibold text-primary-foreground hover:shadow-lg transition-shadow"
          >
            <Plus className="h-3 w-3" /> Post
          </button>
        </div>
      </div>

      <section className="mt-4 px-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder={tab === "find" ? "Search jobs near you" : "Search workers by skill"}
            className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </section>

      <section className="mt-5 px-5">
        <SectionTitle title="Categories" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {jobCategories.map((c) => (
            <button
              key={c}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-muted transition-colors"
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {tab === "find" && (
        <section className="mt-6 px-5 pb-24">
          <SectionTitle title="Featured jobs" />
          <div className="space-y-3">
            {jobs.map((job, idx) => (
              <Card key={idx} className="!p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setApplyJob(job)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{job.t}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {job.l}
                    </div>
                    <p className="mt-1 font-bold text-primary">{job.p}</p>
                  </div>
                  <Badge tone={job.b === "Urgent" ? "destructive" : job.b === "Hot" ? "warning" : "success"}>
                    {job.b}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {tab === "hire" && (
        <section className="mt-6 px-5 pb-24">
          <SectionTitle title="Top workers" />
          <div className="space-y-3">
            {workers.map((w, idx) => (
              <Card key={idx} className="!p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{w.name}</p>
                      <Badge tone="success">{w.badge}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {w.loc}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-gold text-gold" />
                        <span className="font-semibold">{w.rating}</span>
                      </div>
                      <span className="text-muted-foreground">{w.jobs} jobs</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {w.skills.map((s) => (
                        <Badge key={s} tone="primary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Apply Job Modal */}
      {applyJob && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-in">
          <div className="w-full rounded-t-3xl bg-card p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{applyJob.t}</h2>
              <button onClick={() => setApplyJob(null)} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Location</p>
                <p className="mt-1 font-semibold">{applyJob.l}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Pay</p>
                <p className="mt-1 text-lg font-bold text-success">{applyJob.p}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">About this job</p>
                <p className="mt-1 text-sm">Seeking a reliable professional for immediate work. Must have relevant experience and references.</p>
              </div>
            </div>
            <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
              Apply Now
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
