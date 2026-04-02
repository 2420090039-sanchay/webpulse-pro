"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, KeyRound, Clock, Monitor } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

export default function SettingsPage() {
  return (
    <div className="space-y-8 p-6 md:p-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Settings
        </h2>
        <p className="mt-1 max-w-2xl text-base text-muted-foreground">
          Automation, credentials, and appearance. Configure{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.env</code> for production.
        </p>
      </div>

      <Card className="border-border/80 bg-card/80 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            Appearance
          </CardTitle>
          <CardDescription>Light and dark themes with system support.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">Color mode</span>
          <ThemeToggle />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:max-w-3xl">
        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-indigo-500" />
              Scheduled checks
            </CardTitle>
            <CardDescription>
              Call{" "}
              <code className="rounded bg-muted px-1 text-xs">
                GET /api/cron/check?secret=…
              </code>{" "}
              on a schedule. Match the secret with{" "}
              <code className="rounded bg-muted px-1 text-xs">CRON_SECRET</code> in production.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Manual scans: use <strong className="text-foreground">Check now</strong> on the
              Monitors page, or{" "}
              <code className="rounded bg-muted px-1 text-xs">POST /api/check</code> with{" "}
              <code className="rounded bg-muted px-1 text-xs">{`{ }`}</code> for all sites or{" "}
              <code className="rounded bg-muted px-1 text-xs">websiteId</code> for one.
            </p>
            <p className="text-xs">
              Server logs: <code className="text-foreground">[WebPulse:fetch]</code>,{" "}
              <code className="text-foreground">[WebPulse:check]</code>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              AI &amp; screenshots
            </CardTitle>
            <CardDescription>Optional enhancements (server-side).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
            <p>
              <code className="text-foreground">OPENAI_API_KEY</code>, optional{" "}
              <code className="text-foreground">OPENAI_MODEL</code> (default gpt-4o-mini)
            </p>
            <p>
              <code className="text-foreground">ENABLE_SCREENSHOTS=true</code> — local Puppeteer (
              heavy; disable on serverless)
            </p>
            <p>
              <code className="text-foreground">SCREENSHOT_API_URL</code> — returns image bytes or{" "}
              <code className="text-foreground">{`{ "url": "..." }`}</code>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-indigo-500" />
              Email alerts
            </CardTitle>
            <CardDescription>Major changes can send SMTP notifications.</CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-xs leading-relaxed text-muted-foreground">
            SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS · optional ALERT_EMAIL
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-indigo-500" />
              Database
            </CardTitle>
            <CardDescription className="flex items-start gap-2">
              <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              SQLite via Prisma: tables <code className="rounded bg-muted px-1">Website</code>,{" "}
              <code className="rounded bg-muted px-1">Snapshot</code>,{" "}
              <code className="rounded bg-muted px-1">ChangeLog</code>. Path in{" "}
              <code className="rounded bg-muted px-1">prisma/schema.prisma</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
