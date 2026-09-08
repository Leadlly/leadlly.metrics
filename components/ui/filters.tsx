"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, ChevronDown } from "lucide-react";
import {
  DayPicker,
  type DateRange as CalendarRangeValue,
} from "@daypicker/react";
import {
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { toISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const PRESETS = [
  {
    id: "all",
    label: "All time",
    range: () => ({ from: "", to: "" }),
  },
  {
    id: "today",
    label: "Today",
    range: () => {
      const date = toISODate(today());
      return { from: date, to: date };
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    range: () => {
      const date = toISODate(subDays(today(), 1));
      return { from: date, to: date };
    },
  },
  {
    id: "7d",
    label: "Last 7 days",
    range: () => ({
      from: toISODate(subDays(today(), 6)),
      to: toISODate(today()),
    }),
  },
  {
    id: "30d",
    label: "Last 30 days",
    range: () => ({
      from: toISODate(subDays(today(), 29)),
      to: toISODate(today()),
    }),
  },
  {
    id: "this-month",
    label: "This month",
    range: () => ({
      from: toISODate(startOfMonth(today())),
      to: toISODate(today()),
    }),
  },
  {
    id: "last-month",
    label: "Last month",
    range: () => {
      const last = subMonths(today(), 1);
      return {
        from: toISODate(startOfMonth(last)),
        to: toISODate(endOfMonth(last)),
      };
    },
  },
] as const;

function rangeLabel(from: string, to: string) {
  const preset = PRESETS.find((item) => {
    const range = item.range();
    return range.from === from && range.to === to;
  });
  if (preset) return preset.label;
  if (!from && !to) return "All time";
  const start = from ? format(parseISODate(from)!, "dd MMM yyyy") : "…";
  const end = to ? format(parseISODate(to)!, "dd MMM yyyy") : "…";
  return `${start} – ${end}`;
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  className,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [months, setMonths] = useState(1);
  const [draft, setDraft] = useState<CalendarRangeValue | undefined>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 12 });

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setMonths(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setDraft({
      from: from ? parseISODate(from) : undefined,
      to: to ? parseISODate(to) : undefined,
    });
  }, [from, to, open]);

  useEffect(() => {
    if (!open) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(window.innerWidth - 24, months === 2 ? 720 : 360);
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = window.innerWidth - width - 12;
      }
      setPos({
        top: Math.min(rect.bottom + 8, window.innerHeight - 24),
        left: Math.max(12, left),
      });
    }

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    place();
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, months]);

  const activePreset = useMemo(
    () =>
      PRESETS.find((item) => {
        const range = item.range();
        return range.from === from && range.to === to;
      })?.id,
    [from, to],
  );

  function apply(nextFrom: string, nextTo: string) {
    onChange(nextFrom, nextTo);
    setOpen(false);
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between sm:w-auto sm:min-w-[200px]",
          className,
        )}
        aria-label="Choose date range"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarRange className="size-4 shrink-0 text-primary" />
          <span className="truncate">{rangeLabel(from, to)}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      {mounted && open
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-50 w-[min(46rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="flex flex-col md:flex-row">
                <div className="flex gap-1 overflow-x-auto border-b border-border p-2 md:w-40 md:flex-col md:overflow-visible md:border-r md:border-b-0">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={cn(
                        "shrink-0 rounded-xl px-3 py-2 text-left text-sm whitespace-nowrap hover:bg-muted",
                        activePreset === preset.id && "bg-primary/10 font-medium text-primary",
                      )}
                      onClick={() => {
                        const range = preset.range();
                        apply(range.from, range.to);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="min-w-0 overflow-x-auto p-3">
                  <DayPicker
                    mode="range"
                    numberOfMonths={months}
                    resetOnSelect
                    selected={draft}
                    onSelect={setDraft}
                    disabled={{ after: today() }}
                    startMonth={new Date(2020, 0)}
                    endMonth={today()}
                  />
                  <div className="mt-2 flex justify-end gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!draft?.from}
                      onClick={() => {
                        if (!draft?.from) return;
                        apply(
                          toISODate(draft.from),
                          toISODate(draft.to ?? draft.from),
                        );
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {total.toLocaleString("en-IN")} records · page {page} of {pages}
      </span>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? (
        <div className="flex min-w-0 w-full flex-wrap items-center gap-2 lg:w-auto lg:max-w-[58rem] lg:justify-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}
