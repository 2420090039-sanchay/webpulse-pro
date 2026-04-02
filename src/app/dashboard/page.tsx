"use client";

import { useEffect, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Radar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { LinePoint, BarPoint, PiePoint } from "@/components/dashboard/DashboardCharts";

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard/DashboardCharts").then((m) => m.DashboardCharts),
  {
    ssr: false,
    loading: () => <ChartsLazySkeleton />,
  }
);

const ChartsLazySkeleton = memo(function ChartsLazySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-[320px] rounded-2xl lg:col-span-2" />
      <Skeleton className="h-[300px] rounded-2xl" />
      <Skeleton className="h-[300px] rounded-2xl" />
    </div>
  );
});

type Stats = {
  totalMonitors: number;
  activeMonitors: number;
  changesLast24h: number;
  majorChangesCount: number;
  minorChangesCount?: number;
};

const defaultStats: Stats = {
  totalMonitors: 0,
  activeMonitors: 0,
  changesLast24h: 0,
  majorChangesCount: 0,
  minorChangesCount: 0,
};

function StatCardSkeleton() {
  return (
    <Card className="border-border/80 bg-card/80 shadow-md">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-9 w-16" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [lineChart, setLineChart] = useState<LinePoint[]>([]);
  const [barChartByWebsite, setBarChartByWebsite] = useState<BarPoint[]>([]);
  const [pieClassification, setPieClassification] = useState<PiePoint[]>([]);
  const [activityChart, setActivityChart] = useState<
    { name: string; Minor: number; Major: number }[]
  >([]);
  const [aiInsights, setAiInsights] = useState<
    { id: string; websiteName: string; aiSummary: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch("/api/dashboard/stats", { cache: "no-store" }),
        fetch("/api/activity?limit=8", { cache: "no-store" }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          totalMonitors: data.stats?.totalMonitors ?? data.stats?.totalWebsites ?? 0,
          activeMonitors: data.stats?.activeMonitors ?? 0,
          changesLast24h: data.stats?.changesLast24h ?? 0,
          majorChangesCount:
            data.stats?.majorChangesCount ?? data.stats?.majorChanges ?? 0,
          minorChangesCount:
            data.stats?.minorChangesCount ?? data.stats?.minorChanges ?? 0,
        });
        setLineChart(data.lineChart ?? []);
        setBarChartByWebsite(data.barChartByWebsite ?? []);
        setPieClassification(data.pieClassification ?? []);
        setActivityChart(data.activityChart ?? []);
      }

      if (activityRes.ok) {
        const act = await activityRes.json();
        const rows = (act.logs ?? [])
          .filter(
            (l: { aiSummary?: string | null }) =>
              typeof l.aiSummary === "string" && l.aiSummary.trim().length > 0
          )
          .slice(0, 4)
          .map(
            (l: { id: string; websiteName: string; aiSummary: string }) => ({
              id: l.id,
              websiteName: l.websiteName,
              aiSummary: l.aiSummary,
            })
          );
        setAiInsights(rows);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
      toast.error("Could not load dashboard stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <div>
          <Skeleton className="mb-2 h-8 w-48 md:h-9" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <ChartsLazySkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Overview
          </h2>
          <p className="mt-1 max-w-xl text-base text-muted-foreground">
            Real-time snapshot of monitors, detections, and trends across your workspace.
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 gap-2 border-border/80 bg-card/50 shadow-sm transition hover:bg-muted/80"
          onClick={() => load()}
        >
          Refresh data
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="group border-border/80 bg-card/80 shadow-md shadow-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:shadow-black/25">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total monitors
            </CardTitle>
            <Radar className="h-4 w-4 text-indigo-500 opacity-80 transition group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums tracking-tight">
              {stats.totalMonitors}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">URLs in your account</p>
          </CardContent>
        </Card>

        <Card className="group border-border/80 bg-card/80 shadow-md shadow-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:shadow-black/25">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active monitors
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500 opacity-80 transition group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.activeMonitors}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Enabled for scanning</p>
          </CardContent>
        </Card>

        <Card className="group border-border/80 bg-card/80 shadow-md shadow-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:shadow-black/25">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Changes (24h)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500 opacity-80 transition group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {stats.changesLast24h}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Detections logged</p>
          </CardContent>
        </Card>

        <Card className="group border-border/80 bg-card/80 shadow-md shadow-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:shadow-black/25">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Major changes
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500 opacity-80 transition group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums tracking-tight text-red-600 dark:text-red-400">
              {stats.majorChangesCount}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Monitors flagged major</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card/80 shadow-md dark:shadow-black/20">
        <CardHeader>
          <CardTitle className="text-lg">Latest AI summaries</CardTitle>
          <CardDescription>
            Rule-based or OpenAI when <code className="text-xs">OPENAI_API_KEY</code> is set
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiInsights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Run scans after content changes to populate summaries. Configure keywords on each
              monitor for richer context.
            </p>
          ) : (
            aiInsights.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-border/60 bg-muted/15 p-4 transition hover:border-indigo-500/30"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  {row.websiteName}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{row.aiSummary}</p>
              </div>
            ))
          )}
          <Link
            href="/dashboard/activity"
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View full reports →
          </Link>
        </CardContent>
      </Card>

      <DashboardCharts
        lineChart={lineChart}
        barChartByWebsite={barChartByWebsite}
        pieClassification={pieClassification}
      />

      <Card className="border-border/80 bg-card/80 shadow-lg shadow-black/5 dark:shadow-black/20">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Activity trends</CardTitle>
            <CardDescription>Minor vs major events in the last 7 days</CardDescription>
          </div>
          <Link
            href="/dashboard/websites"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
          >
            Manage monitors <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="h-[300px] pl-0 pr-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityChart}>
              <defs>
                <linearGradient id="maj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="min" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Area type="monotone" dataKey="Major" stroke="#ef4444" fill="url(#maj)" />
              <Area type="monotone" dataKey="Minor" stroke="#6366f1" fill="url(#min)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
