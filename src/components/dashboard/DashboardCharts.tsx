"use client";

import { memo, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type LinePoint = {
  date: string;
  label: string;
  total: number;
  minor: number;
  major: number;
};

export type BarPoint = { name: string; changes: number };

export type PiePoint = { name: string; value: number };

type Props = {
  lineChart: LinePoint[];
  barChartByWebsite: BarPoint[];
  pieClassification: PiePoint[];
};

const PIE_COLORS = ["#6366f1", "#ef4444", "#22c55e"];

export const DashboardCharts = memo(function DashboardCharts({
  lineChart,
  barChartByWebsite,
  pieClassification,
}: Props) {
  const pieData = useMemo(
    () => pieClassification.filter((p) => p.value > 0),
    [pieClassification]
  );

  const hasBars = barChartByWebsite.some((b) => b.changes > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/80 bg-card/80 shadow-lg shadow-black/5 backdrop-blur-sm transition hover:shadow-xl dark:shadow-black/20 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Changes over time</CardTitle>
          <CardDescription>
            Total detections per day (last 14 days) — minor vs major
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] pl-0 pr-2 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                name="All changes"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="minor"
                name="Minor"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="major"
                name="Major"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80 shadow-lg shadow-black/5 backdrop-blur-sm transition hover:shadow-xl dark:shadow-black/20">
        <CardHeader>
          <CardTitle className="text-lg">Changes by monitor</CardTitle>
          <CardDescription>Events per site (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-2">
          {hasBars ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartByWebsite}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  horizontal={false}
                />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                />
                <Bar dataKey="changes" name="Changes" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Run checks to populate per-site activity.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80 shadow-lg shadow-black/5 backdrop-blur-sm transition hover:shadow-xl dark:shadow-black/20">
        <CardHeader>
          <CardTitle className="text-lg">Minor vs major</CardTitle>
          <CardDescription>Share of classifications (30 days)</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-2">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={96}
                  paddingAngle={3}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No classified changes in the last 30 days.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
