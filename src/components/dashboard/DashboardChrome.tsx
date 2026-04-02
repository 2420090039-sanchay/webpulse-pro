"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/dashboard/TopNav";

const NAV_META: { prefix: string; title: string; subtitle: string }[] = [
  { prefix: "/dashboard/settings", title: "Settings", subtitle: "Environment & automation" },
  { prefix: "/dashboard/websites", title: "Monitors", subtitle: "Manage URLs, checks, and exports" },
  { prefix: "/dashboard/activity", title: "Reports", subtitle: "Change log and diff history" },
  { prefix: "/dashboard", title: "Dashboard", subtitle: "Overview & analytics" },
];

function metaForPath(pathname: string) {
  for (const m of NAV_META) {
    if (pathname === m.prefix || pathname.startsWith(`${m.prefix}/`)) {
      return m;
    }
  }
  return NAV_META[NAV_META.length - 1]!;
}

export function DashboardChrome() {
  const pathname = usePathname();
  const { title, subtitle } = metaForPath(pathname);
  return <TopNav title={title} subtitle={subtitle} />;
}
