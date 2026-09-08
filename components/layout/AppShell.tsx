"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import Logo from "@/components/icons/Logo";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", short: "Home", icon: LayoutDashboard },
  { href: "/students", label: "Students", short: "Students", icon: GraduationCap },
  { href: "/institutes", label: "Institutes", short: "Institutes", icon: Building2 },
  { href: "/teachers", label: "Teachers & mentors", short: "Teachers", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/signin";
  }

  return (
    <div className="grid-wash min-h-dvh overflow-x-clip lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-sidebar/95 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Logo className="size-7 shrink-0" />
            <div className="min-w-0">
              <p className="font-serif text-base leading-tight font-semibold">
                Leadlly
              </p>
              <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
                Metrics
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
        <nav className="grid grid-cols-4 gap-1 px-2 pb-2">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[10px] leading-tight font-medium sm:text-[11px]",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="w-full truncate">{item.short}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="hidden flex-col border-r border-white/60 bg-sidebar/90 backdrop-blur lg:flex">
        <div className="flex items-center gap-3 px-6 py-5">
            <Logo className="size-10" />
          <div>
            <p className="font-serif text-lg font-semibold tracking-tight">
              Leadlly
            </p>
            <p className="text-[11px] font-medium tracking-[0.18em] text-primary uppercase">
              Metrics
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-white hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-6">
          <p className="px-3 pb-3 text-xs text-muted-foreground">
            Read-only view of student, mentor, and institute data.
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0 overflow-x-clip">
        <main className="mx-auto w-full max-w-7xl px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
