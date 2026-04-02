import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardChrome } from '@/components/dashboard/DashboardChrome';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardChrome />
        <main className="flex-1 bg-gradient-to-br from-indigo-500/[0.06] via-background to-violet-500/[0.04] dark:from-indigo-500/10 dark:via-background dark:to-violet-600/10">
          {children}
        </main>
      </div>
    </div>
  );
}
