"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { ActivityLogEntry, DiffChunk } from "@/types/webpulse";

function KeywordBlurb({ data }: { data: Record<string, unknown> }) {
  const appeared = Array.isArray(data.appeared) ? (data.appeared as string[]) : [];
  const disappeared = Array.isArray(data.disappeared)
    ? (data.disappeared as string[])
    : [];
  const ctx = Array.isArray(data.contextChanged)
    ? (data.contextChanged as { term?: string }[])
    : [];
  if (!appeared.length && !disappeared.length && !ctx.length) return null;
  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        Keywords
      </p>
      {appeared.length > 0 ? (
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Appeared:</span>{" "}
          {appeared.join(", ")}
        </p>
      ) : null}
      {disappeared.length > 0 ? (
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-red-600 dark:text-red-400">Disappeared:</span>{" "}
          {disappeared.join(", ")}
        </p>
      ) : null}
      {ctx.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Context shifts: {ctx.map((c) => c.term).filter(Boolean).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function isDiffChunkArray(value: unknown): value is DiffChunk[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        Array.isArray(item) &&
        item.length >= 2 &&
        typeof item[0] === "number" &&
        typeof item[1] === "string"
    )
  );
}

function LogSkeleton() {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/activity", { cache: "no-store" });
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch {
      toast.error("Could not load reports. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getBadge = (classification: string) => {
    if (classification === "Major") {
      return (
        <Badge className="border border-red-500/30 bg-red-500/15 font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="mr-1 h-3 w-3" /> Major
        </Badge>
      );
    }
    return (
      <Badge className="border border-indigo-500/30 bg-indigo-500/10 font-medium text-indigo-600 dark:text-indigo-400">
        <CheckCircle className="mr-1 h-3 w-3" /> Minor
      </Badge>
    );
  };

  const renderDiff = (diffs: unknown) => {
    if (!isDiffChunkArray(diffs)) {
      return (
        <span className="text-sm text-muted-foreground">No diff payload for this entry.</span>
      );
    }
    return (
      <div className="text-sm leading-relaxed text-foreground">
        {diffs.map((diff, index) => {
          const [operation, text] = diff;
          if (operation === 1) {
            return (
              <span
                key={index}
                className="rounded bg-emerald-500/15 px-0.5 text-emerald-700 dark:text-emerald-400"
              >
                {text}
              </span>
            );
          }
          if (operation === -1) {
            return (
              <span
                key={index}
                className="rounded bg-red-500/15 px-0.5 text-red-600 line-through dark:text-red-400"
              >
                {text}
              </span>
            );
          }
          return (
            <span key={index} className="text-muted-foreground">
              {text}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div>
          <Skeleton className="mb-2 h-8 w-40 md:h-9" />
          <Skeleton className="h-4 max-w-md" />
        </div>
        {[1, 2, 3].map((i) => (
          <LogSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Reports
          </h2>
          <p className="mt-1 max-w-xl text-base text-muted-foreground">
            Change history and semantic diff previews across all monitors.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-[min(70vh,800px)] pr-3 md:h-[min(75vh,900px)]">
          <div className="space-y-4 pb-8">
            {logs.length === 0 ? (
              <Card className="border-dashed border-border/80 bg-card/50">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    No changes logged yet
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Run checks from Monitors. When content drifts from the baseline,
                    entries appear here with a readable diff.
                  </p>
                </CardContent>
              </Card>
            ) : (
              logs.map((log) => (
                <Card
                  key={log.id}
                  className="overflow-hidden border-border/80 bg-card/80 shadow-md transition hover:shadow-lg dark:shadow-black/25"
                >
                  <CardHeader className="border-b border-border/60 bg-muted/20">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="text-lg font-semibold">
                          {log.websiteName}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <a
                            href={log.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-primary underline-offset-4 hover:underline"
                          >
                            {log.websiteUrl}
                          </a>
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        {getBadge(log.classification)}
                        <span className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatDistanceToNow(new Date(log.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 bg-background/40 pt-4">
                    {log.aiSummary ? (
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          AI summary
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground">
                          {log.aiSummary}
                        </p>
                      </div>
                    ) : null}
                    {log.keywordSignals &&
                    typeof log.keywordSignals === "object" &&
                    log.keywordSignals !== null ? (
                      <KeywordBlurb data={log.keywordSignals as Record<string, unknown>} />
                    ) : null}
                    <div className="max-h-56 overflow-y-auto">
                      {renderDiff(log.diffResult)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
