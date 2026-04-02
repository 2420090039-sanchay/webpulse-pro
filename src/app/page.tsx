import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe, ShieldCheck, Activity, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border/80 px-6 backdrop-blur-md supports-backdrop-filter:bg-background/80">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Globe className="h-5 w-5" />
          </span>
          WebPulse Pro
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500">
              Open dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_15%_-5%,rgba(99,102,241,0.12),transparent_55%)] dark:bg-[radial-gradient(ellipse_90%_50%_at_15%_-5%,rgba(99,102,241,0.18),transparent_50%)]"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-24 pt-20 text-center md:pt-28">
          <span className="mb-6 inline-flex items-center rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Intelligent change detection
          </span>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground md:text-6xl md:leading-[1.1]">
            Know exactly when critical pages change
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            WebPulse normalizes content, runs semantic diffs, and ships audit-ready PDFs. Built
            for compliance, competitive intel, and teams who care about what actually changed.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-12 bg-gradient-to-r from-indigo-600 to-violet-600 px-8 text-base text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
              >
                Start monitoring <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/websites">
              <Button size="lg" variant="outline" className="h-12 border-border/80 px-8 text-base">
                View monitors
              </Button>
            </Link>
          </div>

          <div className="mt-28 grid max-w-5xl grid-cols-1 gap-8 border-t border-border/60 pt-16 text-left md:grid-cols-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Semantic diffs</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Strip noise from HTML and compare meaningful text. Fewer false positives, clearer
                reports.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Alerts & PDFs</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Email on major shifts and download structured PDFs for stakeholders and audits.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Dashboard analytics</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Trends, per-site activity, and classification breakdowns — not just raw logs.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/80 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} WebPulse Pro
      </footer>
    </div>
  );
}
