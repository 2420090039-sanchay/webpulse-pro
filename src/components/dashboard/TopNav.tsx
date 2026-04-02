"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { Bell, ChevronDown } from "lucide-react";

export function TopNav({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-background/80 px-6 backdrop-blur-md supports-backdrop-filter:bg-background/70 transition-colors">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/activity"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Open reports"
        >
          <Bell className="h-4 w-4" />
        </Link>
        <ThemeToggle />
        <button
          type="button"
          className="ml-1 flex items-center gap-2 rounded-full border border-border/80 bg-card/80 py-1 pl-1 pr-2.5 text-left shadow-sm transition hover:bg-accent/40"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-xs font-semibold text-white">
            A
          </span>
          <span className="hidden text-sm font-medium text-foreground sm:block">
            Admin
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
        </button>
      </div>
    </header>
  );
}
