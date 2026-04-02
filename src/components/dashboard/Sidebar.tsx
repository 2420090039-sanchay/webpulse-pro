"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  FileBarChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/websites", label: "Monitors", icon: Radar },
  { href: "/dashboard/activity", label: "Reports", icon: FileBarChart },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border/80 bg-sidebar/95 py-5 pl-4 pr-3 backdrop-blur-md">
      <Link
        href="/dashboard"
        className="mb-8 flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-opacity hover:opacity-90"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
          <Radar className="h-5 w-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
            WebPulse
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Pro
          </span>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-foreground shadow-sm ring-1 ring-indigo-500/20"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                  isActive && "text-indigo-500 dark:text-indigo-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border/60 bg-card/50 p-3">
        <p className="text-xs font-medium text-muted-foreground">Workspace</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">
          Production
        </p>
      </div>
    </aside>
  );
}
