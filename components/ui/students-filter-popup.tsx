"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import {
  DayPicker,
  type DateRange as CalendarRangeValue,
} from "@daypicker/react";
import { Check, ChevronLeft, Filter, X } from "lucide-react";
import { toISODate } from "@/lib/dates";
import {
  efficiencyFilterLabel,
  efficiencyOptions,
} from "@/lib/efficiency";
import { istTodayDate } from "@/lib/ist";
import { STUDENT_LEAD_TAGS } from "@/lib/student-tags";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";

export type StudentsFilterValues = {
  from: string;
  to: string;
  category: string;
  onboard: string;
  leadTag: string;
  efficiency: string;
};

type FilterSection =
  | "category"
  | "onboard"
  | "leadTag"
  | "efficiency"
  | "created";

const SECTIONS: Array<{ id: FilterSection; label: string }> = [
  { id: "category", label: "Plan type" },
  { id: "onboard", label: "DNA report" },
  { id: "leadTag", label: "Lead tag" },
  { id: "efficiency", label: "Accuracy" },
  { id: "created", label: "Created date" },
];

const DATE_PRESETS = [
  {
    id: "all",
    label: "All time",
    range: () => ({ from: "", to: "" }),
  },
  {
    id: "today",
    label: "Today",
    range: () => {
      const date = toISODate(istTodayDate());
      return { from: date, to: date };
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    range: () => {
      const date = toISODate(subDays(istTodayDate(), 1));
      return { from: date, to: date };
    },
  },
  {
    id: "7d",
    label: "Last 7 days",
    range: () => ({
      from: toISODate(subDays(istTodayDate(), 6)),
      to: toISODate(istTodayDate()),
    }),
  },
  {
    id: "30d",
    label: "Last 30 days",
    range: () => ({
      from: toISODate(subDays(istTodayDate(), 29)),
      to: toISODate(istTodayDate()),
    }),
  },
  {
    id: "this-month",
    label: "This month",
    range: () => ({
      from: toISODate(startOfMonth(istTodayDate())),
      to: toISODate(istTodayDate()),
    }),
  },
  {
    id: "last-month",
    label: "Last month",
    range: () => {
      const last = subMonths(istTodayDate(), 1);
      return {
        from: toISODate(startOfMonth(last)),
        to: toISODate(endOfMonth(last)),
      };
    },
  },
] as const;

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function createdLabel(from: string, to: string) {
  const preset = DATE_PRESETS.find((item) => {
    const range = item.range();
    return range.from === from && range.to === to;
  });
  if (preset) return preset.label;
  if (!from && !to) return "All time";
  const start = from ? format(parseISODate(from)!, "dd MMM") : "…";
  const end = to ? format(parseISODate(to)!, "dd MMM") : "…";
  return `${start} – ${end}`;
}

function sectionSummary(
  section: FilterSection,
  values: StudentsFilterValues,
  tagCounts: Record<string, number>,
) {
  switch (section) {
    case "category":
      if (values.category === "free") return "Free";
      if (values.category === "subscription") return "Subscription";
      return "All";
    case "onboard":
      if (values.onboard === "generated") return "Generated";
      if (values.onboard === "missing") return "Not generated";
      return "All";
    case "leadTag":
      if (values.leadTag === "untagged") return "Untagged";
      if (values.leadTag !== "all") {
        const tag = STUDENT_LEAD_TAGS.find((item) => item.id === values.leadTag);
        const count = tagCounts[values.leadTag];
        return count ? `${tag?.label || values.leadTag} (${count})` : tag?.label || values.leadTag;
      }
      return "All";
    case "efficiency":
      return efficiencyFilterLabel(values.efficiency);
    case "created":
      return createdLabel(values.from, values.to);
  }
}

function isSectionActive(section: FilterSection, values: StudentsFilterValues) {
  switch (section) {
    case "category":
      return values.category !== "all";
    case "onboard":
      return values.onboard !== "all";
    case "leadTag":
      return values.leadTag !== "all";
    case "efficiency":
      return values.efficiency !== "all";
    case "created":
      return Boolean(values.from || values.to);
  }
}

export function countActiveStudentFilters(values: StudentsFilterValues) {
  return SECTIONS.filter((section) => isSectionActive(section.id, values)).length;
}

function OptionButton({
  selected,
  onClick,
  children,
  swatch,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
        selected
          ? "bg-primary/10 font-medium text-primary"
          : "hover:bg-muted text-foreground",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {swatch ? (
          <span
            className="size-3 shrink-0 rounded-sm border border-black/10"
            style={{ background: swatch }}
          />
        ) : null}
        <span className="truncate">{children}</span>
      </span>
      {selected ? <Check className="size-4 shrink-0" /> : null}
    </button>
  );
}

const EMPTY_FILTERS: StudentsFilterValues = {
  from: "",
  to: "",
  category: "all",
  onboard: "all",
  leadTag: "all",
  efficiency: "all",
};

export function StudentsFilterPopup({
  value,
  onApply,
  tagCounts,
  className,
}: {
  value: StudentsFilterValues;
  onApply: (next: StudentsFilterValues) => void;
  tagCounts: Record<string, number>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [section, setSection] = useState<FilterSection>("category");
  const [draft, setDraft] = useState<StudentsFilterValues>(value);
  const [customOpen, setCustomOpen] = useState(false);
  const [calendarMonths, setCalendarMonths] = useState(1);
  const [customRange, setCustomRange] = useState<CalendarRangeValue | undefined>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCount = countActiveStudentFilters(value);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    const matchesPreset = DATE_PRESETS.some((item) => {
      const range = item.range();
      return range.from === value.from && range.to === value.to;
    });
    const isCustom = Boolean(value.from || value.to) && !matchesPreset;
    setCustomOpen(isCustom);
    setCustomRange({
      from: value.from ? parseISODate(value.from) : undefined,
      to: value.to ? parseISODate(value.to) : undefined,
    });
  }, [open, value]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setCalendarMonths(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setOpenUp(window.innerHeight - rect.bottom < (customOpen ? 520 : 420));
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
  }, [open, customOpen]);

  const activeDatePreset = useMemo(
    () =>
      DATE_PRESETS.find((item) => {
        const range = item.range();
        return range.from === draft.from && range.to === draft.to;
      })?.id,
    [draft.from, draft.to],
  );

  const customSelected = customOpen || (!activeDatePreset && Boolean(draft.from || draft.to));

  function applyDraft(next: StudentsFilterValues) {
    onApply(next);
    setOpen(false);
  }

  function applyCustomRange() {
    if (!customRange?.from) return;
    const from = toISODate(customRange.from);
    const to = toISODate(customRange.to ?? customRange.from);
    setDraft((current) => ({ ...current, from, to }));
    setCustomOpen(true);
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        className="shrink-0 justify-between sm:min-w-[132px]"
        aria-label="Open filters"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-2">
          <Filter className="size-4 text-primary" />
          Filters
          {activeCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </span>
      </Button>

      {open ? (
        <div
          ref={panelRef}
          className={cn(
            "absolute z-50 overflow-hidden rounded-2xl border border-border bg-white shadow-lg",
            customOpen && section === "created"
              ? "w-[min(100vw-1.5rem,44rem)]"
              : "w-[min(100vw-1.5rem,34rem)]",
            openUp ? "bottom-full right-0 mb-2" : "top-full right-0 mt-2",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Filters</p>
              <p className="text-xs text-muted-foreground">
                Pick a filter on the right, then choose options on the left
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close filters"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex min-h-[280px]">
            <div className="min-w-0 flex-1 border-r border-border p-2 sm:p-3">
              <div className="mb-2 flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:hidden">
                <ChevronLeft className="size-3.5" />
                {SECTIONS.find((item) => item.id === section)?.label}
              </div>
              <div
                className={cn(
                  "space-y-1 overflow-y-auto",
                  customOpen && section === "created" ? "max-h-[420px]" : "max-h-[320px]",
                )}
              >
                {section === "category" ? (
                  <>
                    <OptionButton
                      selected={draft.category === "all"}
                      onClick={() => setDraft((current) => ({ ...current, category: "all" }))}
                    >
                      All plans
                    </OptionButton>
                    <OptionButton
                      selected={draft.category === "free"}
                      onClick={() => setDraft((current) => ({ ...current, category: "free" }))}
                    >
                      Free
                    </OptionButton>
                    <OptionButton
                      selected={draft.category === "subscription"}
                      onClick={() =>
                        setDraft((current) => ({ ...current, category: "subscription" }))
                      }
                    >
                      Subscription
                    </OptionButton>
                  </>
                ) : null}

                {section === "onboard" ? (
                  <>
                    <OptionButton
                      selected={draft.onboard === "all"}
                      onClick={() => setDraft((current) => ({ ...current, onboard: "all" }))}
                    >
                      All DNA reports
                    </OptionButton>
                    <OptionButton
                      selected={draft.onboard === "generated"}
                      onClick={() =>
                        setDraft((current) => ({ ...current, onboard: "generated" }))
                      }
                    >
                      DNA generated
                    </OptionButton>
                    <OptionButton
                      selected={draft.onboard === "missing"}
                      onClick={() =>
                        setDraft((current) => ({ ...current, onboard: "missing" }))
                      }
                    >
                      DNA not generated
                    </OptionButton>
                  </>
                ) : null}

                {section === "leadTag" ? (
                  <>
                    <OptionButton
                      selected={draft.leadTag === "all"}
                      onClick={() => setDraft((current) => ({ ...current, leadTag: "all" }))}
                    >
                      All lead tags
                    </OptionButton>
                    <OptionButton
                      selected={draft.leadTag === "untagged"}
                      onClick={() =>
                        setDraft((current) => ({ ...current, leadTag: "untagged" }))
                      }
                    >
                      Untagged
                    </OptionButton>
                    {STUDENT_LEAD_TAGS.map((tag) => (
                      <OptionButton
                        key={tag.id}
                        selected={draft.leadTag === tag.id}
                        onClick={() =>
                          setDraft((current) => ({ ...current, leadTag: tag.id }))
                        }
                      >
                        {tag.label}
                        {tagCounts[tag.id] ? ` (${tagCounts[tag.id]})` : ""}
                      </OptionButton>
                    ))}
                  </>
                ) : null}

                {section === "efficiency" ? (
                  <>
                    <OptionButton
                      selected={draft.efficiency === "all"}
                      onClick={() =>
                        setDraft((current) => ({ ...current, efficiency: "all" }))
                      }
                    >
                      All accuracy
                    </OptionButton>
                    {efficiencyOptions.map((option) => (
                      <OptionButton
                        key={option.id}
                        selected={draft.efficiency === option.id}
                        swatch={option.swatch}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            efficiency: option.id,
                          }))
                        }
                      >
                        {option.label}
                      </OptionButton>
                    ))}
                  </>
                ) : null}

                {section === "created" ? (
                  <>
                    {DATE_PRESETS.map((preset) => (
                      <OptionButton
                        key={preset.id}
                        selected={!customOpen && activeDatePreset === preset.id}
                        onClick={() => {
                          const range = preset.range();
                          setCustomOpen(false);
                          setDraft((current) => ({
                            ...current,
                            from: range.from,
                            to: range.to,
                          }));
                        }}
                      >
                        {preset.label}
                      </OptionButton>
                    ))}
                    <OptionButton
                      selected={customSelected}
                      onClick={() => {
                        setCustomOpen(true);
                        setCustomRange({
                          from: draft.from ? parseISODate(draft.from) : undefined,
                          to: draft.to ? parseISODate(draft.to) : undefined,
                        });
                      }}
                    >
                      Custom range
                    </OptionButton>
                    {customOpen ? (
                      <div className="mt-2 rounded-2xl border border-border bg-white p-2">
                        <DayPicker
                          className="metrics-daypicker"
                          mode="range"
                          numberOfMonths={calendarMonths}
                          resetOnSelect
                          selected={customRange}
                          onSelect={setCustomRange}
                          disabled={{ after: istTodayDate() }}
                          startMonth={new Date(2020, 0)}
                          endMonth={istTodayDate()}
                        />
                        <div className="mt-2 flex justify-end gap-2 border-t border-border pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCustomOpen(false)}
                          >
                            Back
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!customRange?.from}
                            onClick={applyCustomRange}
                          >
                            Use range
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex w-[9.5rem] shrink-0 flex-col gap-1 bg-muted/40 p-2 sm:w-44 sm:p-3">
              {SECTIONS.map((item) => {
                const active = isSectionActive(item.id, draft);
                const selected = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "rounded-xl px-2.5 py-2 text-left transition sm:px-3",
                      selected
                        ? "bg-white shadow-sm ring-1 ring-border"
                        : "hover:bg-white/70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          selected ? "text-primary" : "text-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                      {active ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {sectionSummary(item.id, draft, tagCounts)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3 sm:px-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(EMPTY_FILTERS);
                setCustomOpen(false);
                setCustomRange(undefined);
              }}
            >
              Clear all
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => applyDraft(draft)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
