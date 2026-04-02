"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { WebsiteRow } from "@/types/webpulse";

const COL_COUNT = 7;

function TableRowSkeleton() {
  return (
    <TableRow className="border-border/60">
      <TableCell>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-1 h-3 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-36" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-8 w-40" />
      </TableCell>
    </TableRow>
  );
}

function keywordActivitySummary(site: WebsiteRow): string | null {
  const k = site.latestKeywordSignals;
  if (!k) return null;
  const parts: string[] = [];
  if (k.appeared?.length)
    parts.push(`+${k.appeared.length} appeared`);
  if (k.disappeared?.length)
    parts.push(`−${k.disappeared.length} gone`);
  if (k.contextChanged?.length)
    parts.push(`${k.contextChanged.length} context`);
  return parts.length ? parts.join(" · ") : null;
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [shotCompare, setShotCompare] = useState<{
    name: string;
    latest?: string | null;
    previous?: string | null;
  } | null>(null);

  const fetchWebsites = useCallback(async () => {
    try {
      const res = await fetch("/api/websites", { cache: "no-store" });
      if (!res.ok) throw new Error("Bad response");
      const data = await res.json();
      setWebsites(data.websites ?? []);
    } catch {
      toast.error("Could not load monitors. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const keywords = newKeywords
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, url: newUrl, keywords }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.check?.status === "Error" || data.check?.status === "Down") {
          toast.error(
            data.check.error ||
              "Monitor saved but the endpoint was unreachable (DOWN)."
          );
        } else {
          toast.success(
            data.check?.status === "First Scan"
              ? "Monitor added — baseline snapshot saved"
              : "Monitor added and checked"
          );
        }
        setOpen(false);
        setNewUrl("");
        setNewName("");
        setNewKeywords("");
        fetchWebsites();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to add monitor");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Major":
        return (
          <Badge className="border border-red-500/30 bg-red-500/10 font-medium text-red-600 shadow-sm dark:text-red-400">
            <AlertTriangle className="mr-1 h-3 w-3" /> Major
          </Badge>
        );
      case "Minor":
        return (
          <Badge className="border border-indigo-500/30 bg-indigo-500/10 font-medium text-indigo-600 dark:text-indigo-400">
            <AlertTriangle className="mr-1 h-3 w-3" /> Minor
          </Badge>
        );
      case "No Change":
        return (
          <Badge className="border border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="mr-1 h-3 w-3" /> No change
          </Badge>
        );
      case "Down":
        return (
          <Badge className="border border-rose-500/35 bg-rose-500/15 font-medium text-rose-700 dark:text-rose-400">
            <AlertTriangle className="mr-1 h-3 w-3" /> Down
          </Badge>
        );
      case "Error":
        return (
          <Badge className="border border-amber-500/35 bg-amber-500/10 font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mr-1 h-3 w-3" /> Error
          </Badge>
        );
      default:
        return (
          <Badge className="border border-border bg-muted/50 font-medium text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  const runCheck = async (websiteId?: string) => {
    if (websiteId) setCheckingId(websiteId);
    else setCheckingAll(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(websiteId ? { websiteId } : {}),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Check failed");
        return;
      }
      toast.success(
        websiteId
          ? `Check finished: ${(data.results?.[0] as { status?: string })?.status ?? "OK"}`
          : `Checked ${(data.results as unknown[])?.length ?? 0} monitor(s)`
      );
      await fetchWebsites();
    } catch (e) {
      console.error("[WebPulse] check", e);
      toast.error("Network error while running checks.");
    } finally {
      setCheckingId(null);
      setCheckingAll(false);
    }
  };

  const handleDownloadPDF = async (websiteId: string) => {
    toast.loading("Building PDF report…", { id: "pdf-toast" });
    try {
      const res = await fetch(`/api/reports/generate?websiteId=${websiteId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `webpulse-pro-report-${websiteId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Report downloaded", { id: "pdf-toast" });
    } catch {
      toast.error("Could not generate PDF", { id: "pdf-toast" });
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-8">
      <Dialog open={!!shotCompare} onOpenChange={(o) => !o && setShotCompare(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-border/80 bg-card">
          <DialogHeader>
            <DialogTitle>Screenshot compare — {shotCompare?.name}</DialogTitle>
          </DialogHeader>
          {shotCompare && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Previous capture
                </p>
                {shotCompare.previous ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shotCompare.previous}
                    alt="Previous"
                    className="w-full rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Latest capture
                </p>
                {shotCompare.latest ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shotCompare.latest}
                    alt="Latest"
                    className="w-full rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    No image (enable screenshots in Settings / env)
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Monitors
          </h2>
          <p className="mt-1 max-w-xl text-base text-muted-foreground">
            AI summaries, keyword signals, uptime probes, and optional screenshots per scan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-border/80 bg-card/60 shadow-sm transition hover:bg-muted/80"
            disabled={checkingAll || websites.length === 0}
            onClick={() => runCheck()}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${checkingAll ? "animate-spin" : ""}`}
            />
            Check all now
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-medium text-white shadow-md shadow-indigo-500/25 outline-none transition hover:from-indigo-500 hover:to-violet-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50">
              <Plus className="h-4 w-4" /> Add monitor
            </DialogTrigger>
            <DialogContent className="border-border/80 bg-card text-card-foreground sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle className="text-xl">Add monitor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddWebsite} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    required
                    className="bg-background/80"
                    placeholder="e.g. Pricing page"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    required
                    className="bg-background/80"
                    placeholder="https://example.com"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keys">Keywords (optional)</Label>
                  <Input
                    id="keys"
                    className="bg-background/80"
                    placeholder="price, discount, offer"
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated. We flag appear / disappear / context shifts in text.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 font-medium"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Save & run first check"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-lg shadow-black/5 dark:shadow-black/20">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-muted-foreground">Website</TableHead>
                <TableHead className="text-muted-foreground">Uptime</TableHead>
                <TableHead className="text-muted-foreground">Content</TableHead>
                <TableHead className="text-muted-foreground">Keywords</TableHead>
                <TableHead className="min-w-[140px] text-muted-foreground">
                  AI summary
                </TableHead>
                <TableHead className="text-muted-foreground">Last check</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </>
              ) : websites.length === 0 ? (
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableCell colSpan={COL_COUNT} className="py-20 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 text-indigo-500 ring-1 ring-indigo-500/20">
                        <Plus className="h-7 w-7" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">
                        No monitors yet
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Add a URL to capture a baseline. Enable OPENAI_API_KEY for richer
                        summaries; set ENABLE_SCREENSHOTS=true locally for captures.
                      </p>
                      <Button
                        className="mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 font-medium text-white"
                        onClick={() => setOpen(true)}
                      >
                        Add your first monitor
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                websites.map((site) => {
                  const snaps = site.recentSnapshots ?? [];
                  const latestShot = snaps[0]?.screenshotPath ?? null;
                  const prevShot = snaps[1]?.screenshotPath ?? null;
                  const activity = keywordActivitySummary(site);
                  const up =
                    site.lastIsUp !== undefined ? site.lastIsUp : site.status !== "Down";
                  return (
                    <TableRow
                      key={site._id}
                      className="border-border/60 transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="align-top">
                        <div className="font-medium text-foreground">{site.name}</div>
                        <span
                          className="mt-1 block max-w-[200px] truncate text-xs text-muted-foreground sm:max-w-xs"
                          title={site.url}
                        >
                          {site.url}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={
                              up
                                ? "w-fit border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "w-fit border border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
                            }
                          >
                            {up ? "UP" : "DOWN"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {site.uptimePercent ?? 100}% / last 100
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {site.lastLatencyMs != null
                              ? `${site.lastLatencyMs} ms`
                              : "— ms"}
                            {site.lastHttpStatus != null
                              ? ` · HTTP ${site.lastHttpStatus}`
                              : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {getStatusBadge(site.status)}
                      </TableCell>
                      <TableCell className="max-w-[160px] align-top">
                        <div className="flex flex-wrap gap-1">
                          {(site.keywords ?? []).slice(0, 5).map((k) => (
                            <Badge
                              key={k}
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              {k}
                            </Badge>
                          ))}
                        </div>
                        {activity ? (
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                            {activity}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">—</p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] align-top text-xs text-muted-foreground">
                        {site.latestAiSummary ? (
                          <span title={site.latestAiSummary}>
                            {site.latestAiSummary.slice(0, 100)}
                            {site.latestAiSummary.length > 100 ? "…" : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top text-sm text-muted-foreground">
                        {site.lastChecked
                          ? formatDistanceToNow(new Date(site.lastChecked), {
                              addSuffix: true,
                            })
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-border/80"
                            disabled={!latestShot && !prevShot}
                            onClick={() =>
                              setShotCompare({
                                name: site.name,
                                latest: latestShot,
                                previous: prevShot,
                              })
                            }
                          >
                            <ImageIcon className="mr-1 h-3.5 w-3.5" />
                            Shots
                          </Button>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-border/80"
                            disabled={checkingAll || checkingId === site._id}
                            onClick={() => runCheck(site._id)}
                          >
                            <RefreshCw
                              className={`mr-1 h-3.5 w-3.5 ${checkingId === site._id ? "animate-spin" : ""}`}
                            />
                            Check
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-border/80"
                            onClick={() => handleDownloadPDF(site._id)}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/dashboard/settings"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Settings
        </Link>{" "}
        documents OPENAI_API_KEY, ENABLE_SCREENSHOTS, SCREENSHOT_API_URL, and cron hooks.
      </p>
    </div>
  );
}
