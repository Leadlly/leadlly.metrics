import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:text-xs">
            {label}
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight sm:mt-2 sm:text-2xl">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs break-words text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-10 sm:rounded-2xl">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm backdrop-blur sm:rounded-3xl",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5 sm:py-4">
          {title ? (
            <h2 className="min-w-0 truncate font-semibold">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground sm:py-12">
      {message}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl bg-white/70 sm:h-28 sm:rounded-3xl"
        />
      ))}
    </div>
  );
}

export function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right break-words">{children}</span>
    </div>
  );
}
