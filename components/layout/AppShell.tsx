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
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/institutes", label: "Institutes", icon: Building2 },
  { href: "/teachers", label: "Teachers & mentors", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/signin";
  }

  return (
    <div className="grid-wash min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-b border-white/60 bg-sidebar/90 backdrop-blur lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-6 py-5">
          <Logo className="size-8" />
          <div>
            <p className="font-serif text-lg font-semibold tracking-tight">
              Leadlly
            </p>
            <p className="text-[11px] font-medium tracking-[0.18em] text-primary uppercase">
              Metrics
            </p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible">
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
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-white hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-3 pb-6 lg:block">
          <p className="px-3 pb-3 text-xs text-muted-foreground">
            Read-only view of student, mentor, and institute data.
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex justify-end px-4 pt-4 lg:hidden">
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
