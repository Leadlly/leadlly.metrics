"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Maximize2, Minimize2, Search } from "lucide-react";
import { displayDateTime, displayDateValue, displayValue } from "@/lib/display";
import {
  efficiencyOptions,
  efficiencyRowClass,
  matchesEfficiencyFilter,
  previousDayEfficiency,
} from "@/lib/efficiency";
import { STUDENT_EXPORT_FIELDS } from "@/lib/fields";
import { STUDENT_TABLE_COLUMNS } from "@/lib/columns";
import { type LeadTag } from "@/lib/student-tags";
import { fullName, cn } from "@/lib/utils";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { useStudentLeadTags } from "@/hooks/use-student-lead-tags";
import { PageHeader } from "@/components/ui/filters";
import { StudentsFilterPopup } from "@/components/ui/students-filter-popup";
import { downloadExport, ExportDialog } from "@/components/ui/export-dialog";
import { ColumnPicker } from "@/components/ui/column-picker";
import { TableFrame } from "@/components/ui/data-table";
import {
  LeadTagBadge,
  LeadTagMenu,
  RowCheckbox,
  SelectAllCheckbox,
} from "@/components/ui/lead-tag-menu";
import { Badge, Button, Input } from "@/components/ui/primitives";
import { EmptyState, Panel, StatCard } from "@/components/ui/stat-card";

type Student = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  parentName?: string;
  parentPhone?: string;
  category: string;
  standard: string;
  exam: string;
  school?: string;
  coaching?: string;
  institute: string;
  subscription: string;
  planId?: string;
  freeTrial?: string;
  level: number;
  points?: number;
  streak: number;
  gender?: string;
  createdAt?: string;
  lastActivity?: string;
  onboard?: boolean;
  disabled?: boolean;
  dailyReportDate?: string;
  dailyReportOverall?: number;
  previousDayOverall?: number;
};

type Payload = {
  total: number;
  page: number;
  pages: number;
  stats: { total: number; active1d: number; active7d: number; active30d: number };
  rows: Student[];
};

type AppliedFilters = {
  from: string;
  to: string;
  q: string;
  category: string;
  onboard: string;
  leadTag: string;
  efficiency: string;
};

const LIST_LIMIT = "10000";
const FILTER_STORAGE_KEY = "metrics-students-filters";
const FILTER_KEYS = [
  "from",
  "to",
  "q",
  "category",
  "onboard",
  "leadTag",
  "efficiency",
] as const;

function readFilters(params: URLSearchParams): AppliedFilters {
  return {
    from: params.get("from") || "",
    to: params.get("to") || "",
    q: params.get("q") || "",
    category: params.get("category") || "all",
    onboard: params.get("onboard") || "all",
    leadTag: params.get("leadTag") || "all",
    efficiency: params.get("efficiency") || "all",
  };
}

function filtersToParams(filters: AppliedFilters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q) params.set("q", filters.q);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.onboard !== "all") params.set("onboard", filters.onboard);
  if (filters.leadTag !== "all") params.set("leadTag", filters.leadTag);
  if (filters.efficiency !== "all") params.set("efficiency", filters.efficiency);
  return params;
}

function saveFilters(filters: AppliedFilters) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore quota / private mode
  }
}

function loadSavedFilters(): AppliedFilters | null {
  try {
    const raw =
      localStorage.getItem(FILTER_STORAGE_KEY) ||
      sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppliedFilters>;
    const filters: AppliedFilters = {
      from: parsed.from || "",
      to: parsed.to || "",
      q: parsed.q || "",
      category: parsed.category || "all",
      onboard: parsed.onboard || "all",
      leadTag: parsed.leadTag || "all",
      efficiency: parsed.efficiency || "all",
    };
    // Migrate older sessionStorage copies into localStorage.
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    sessionStorage.removeItem(FILTER_STORAGE_KEY);
    return filters;
  } catch {
    return null;
  }
}

function categoryTone(value: string) {
  if (value === "free") return "neutral" as const;
  return "purple" as const;
}

function subTone(value: string) {
  if (value === "active" || value === "authenticated") return "green" as const;
  if (value === "cancelled" || value === "expired") return "red" as const;
  return "neutral" as const;
}

function StudentIdentity({
  row,
  tagId,
  onRemoveTag,
}: {
  row: Student;
  tagId?: string | null;
  onRemoveTag?: () => void;
}) {
  return (
    <div className="min-w-0">
      <Link href={`/students/${row.id}`} className="font-medium hover:underline">
        {fullName(row.firstname, row.lastname)}
      </Link>
      <p className="truncate text-xs text-muted-foreground">{row.email}</p>
      {row.phone ? (
        <p className="text-xs text-muted-foreground">{row.phone}</p>
      ) : null}
      {tagId ? (
        <div className="mt-1.5" onClick={(event) => event.stopPropagation()}>
          <LeadTagBadge tagId={tagId} onRemove={onRemoveTag} />
        </div>
      ) : null}
    </div>
  );
}

function StudentCell({
  columnKey,
  row,
  tagId,
  onRemoveTag,
}: {
  columnKey: string;
  row: Student;
  tagId?: string | null;
  onRemoveTag?: () => void;
}) {
  switch (columnKey) {
    case "student":
      return <StudentIdentity row={row} tagId={tagId} onRemoveTag={onRemoveTag} />;
    case "category":
      return <Badge tone={categoryTone(row.category)}>{row.category || "free"}</Badge>;
    case "examClass":
      return (
        <div>
          <p>{row.exam || "—"}</p>
          <p className="text-xs text-muted-foreground">
            {row.standard ? `Class ${row.standard}` : "—"}
          </p>
        </div>
      );
    case "subscription":
      return <Badge tone={subTone(row.subscription)}>{row.subscription}</Badge>;
    case "lastActivity":
      return (
        <span className="text-muted-foreground">
          {displayDateTime(row.lastActivity)}
        </span>
      );
    case "createdAt":
      return (
        <span className="text-muted-foreground">{displayDateValue(row.createdAt)}</span>
      );
    case "onboard":
      return (
        <Badge tone={row.onboard ? "green" : "neutral"}>
          {row.onboard ? "generated" : "not generated"}
        </Badge>
      );
    case "disabled":
      return displayValue(row.disabled);
    default:
      return displayValue((row as Record<string, unknown>)[columnKey]);
  }
}

export function StudentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const applied = useMemo(() => readFilters(searchParams), [searchParams]);
  const [filtersReady, setFiltersReady] = useState(false);
  const [q, setQ] = useState(applied.q);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [listFullscreen, setListFullscreen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const columns = useColumnPrefs("students", STUDENT_TABLE_COLUMNS);
  const leadTags = useStudentLeadTags();

  useEffect(() => {
    if (filtersReady) return;
    const hasUrlFilters = FILTER_KEYS.some((key) => searchParams.has(key));
    if (hasUrlFilters) {
      setFiltersReady(true);
      return;
    }
    const saved = loadSavedFilters();
    const query = saved ? filtersToParams(saved).toString() : "";
    if (query) {
      router.replace(`${pathname}?${query}`, { scroll: false });
      return;
    }
    setFiltersReady(true);
  }, [filtersReady, searchParams, pathname, router]);

  useEffect(() => {
    setQ(applied.q);
  }, [applied.q]);

  useEffect(() => {
    if (!filtersReady) return;
    saveFilters(applied);
  }, [applied, filtersReady]);

  const commitFilters = useCallback(
    (next: AppliedFilters) => {
      saveFilters(next);
      const params = filtersToParams(next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const taggedQuery = useMemo(() => {
    if (applied.leadTag === "all") return "";
    if (applied.leadTag === "untagged") {
      return Object.keys(leadTags.tags).sort().join(",");
    }
    return Object.entries(leadTags.tags)
      .filter(([, tag]) => tag === applied.leadTag)
      .map(([id]) => id)
      .sort()
      .join(",");
  }, [applied.leadTag, leadTags.tags]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: LIST_LIMIT });
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);
    if (applied.q) params.set("q", applied.q);
    if (applied.category !== "all") params.set("category", applied.category);
    if (applied.onboard !== "all") params.set("onboard", applied.onboard);
    if (applied.leadTag === "untagged" && taggedQuery) {
      params.set("excludeIds", taggedQuery);
    } else if (applied.leadTag !== "all") {
      if (!taggedQuery) {
        setData({
          total: 0,
          page: 1,
          pages: 1,
          stats: { total: 0, active1d: 0, active7d: 0, active30d: 0 },
          rows: [],
        });
        setLoading(false);
        return;
      }
      params.set("ids", taggedQuery);
    }
    try {
      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setError("Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [applied, taggedQuery]);

  useEffect(() => {
    if (!filtersReady) return;
    load();
  }, [load, filtersReady]);

  useEffect(() => {
    setSelected(new Set());
  }, [applied]);

  useEffect(() => {
    if (!listFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setListFullscreen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [listFullscreen]);

  const visibleRows = useMemo(() => {
    const rows = data?.rows || [];
    if (applied.efficiency === "all") return rows;
    return rows.filter((row) =>
      matchesEfficiencyFilter(row.previousDayOverall, applied.efficiency),
    );
  }, [applied.efficiency, data?.rows]);

  const visibleIds = visibleRows.map((row) => row.id);
  const selectedOnPage = visibleIds.filter((id) => selected.has(id));
  const allSelected = visibleIds.length > 0 && selectedOnPage.length === visibleIds.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tag of Object.values(leadTags.tags)) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
    return counts;
  }, [leadTags.tags]);

  function toggleRow(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function applyLeadTag(tag: LeadTag | null) {
    leadTags.setTag([...selected], tag?.id || null);
    setSelected(new Set());
  }

  async function handleExport(fields: string[], format: "csv" | "xlsx") {
    setExporting(true);
    try {
      await downloadExport("/api/students/export", {
        ...applied,
        fields,
        format,
      });
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Student app"
        title="Students"
        description="Activity, signups, and user-level data. Filter by created date and export the list."
        action={
          <Button onClick={() => setExportOpen(true)}>
            <Download className="size-4" />
            Export
          </Button>
        }
      />
      <div className="relative z-30 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitFilters({ ...applied, q });
              }
            }}
            className="pl-9"
          />
        </div>
        <StudentsFilterPopup
          value={{
            from: applied.from,
            to: applied.to,
            category: applied.category,
            onboard: applied.onboard,
            leadTag: applied.leadTag,
            efficiency: applied.efficiency,
          }}
          tagCounts={tagCounts}
          onApply={(next) => {
            commitFilters({
              ...applied,
              ...next,
              q,
            });
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Yesterday’s efficiency</span>
        {efficiencyOptions.map((option) => (
          <span key={option.label} className="inline-flex items-center gap-1.5">
            <span
              className="size-3 rounded-sm border border-black/10"
              style={{ background: option.swatch }}
            />
            {option.label}
          </span>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Users in range" value={data?.stats.total ?? 0} />
        <StatCard
          label="Active today"
          value={data?.stats.active1d ?? 0}
          hint="Updated in last 24 hours"
        />
        <StatCard label="Active 7 days" value={data?.stats.active7d ?? 0} />
        <StatCard label="Active 30 days" value={data?.stats.active30d ?? 0} />
      </div>

      <Panel
        title="User list"
        className={cn(
          listFullscreen &&
            "fixed inset-0 z-[60] m-0 flex h-dvh max-h-dvh flex-col overflow-hidden rounded-none border-0 bg-white sm:rounded-none",
        )}
        bodyClassName={cn(listFullscreen && "min-h-0 flex-1 overflow-hidden")}
        action={
          <div className="flex items-center gap-2 sm:gap-3">
            {data ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {visibleRows.length === (data.total || 0) && applied.efficiency === "all"
                  ? `${data.total} students`
                  : `Showing ${visibleRows.length} of ${data.total}`}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={listFullscreen ? "Exit full screen" : "Full screen user list"}
              onClick={() => setListFullscreen((current) => !current)}
            >
              {listFullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
              <span className="hidden sm:inline">
                {listFullscreen ? "Exit" : "Full screen"}
              </span>
            </Button>
            <ColumnPicker
              catalog={STUDENT_TABLE_COLUMNS}
              order={columns.prefs.order}
              visible={columns.prefs.visible}
              onToggle={columns.toggle}
              onReorder={columns.reorder}
              onReset={columns.reset}
            />
          </div>
        }
      >
        <TableFrame
          columnCount={columns.visibleColumns.length + 1}
          stickyHeader
          className={cn(listFullscreen && "max-h-[calc(100dvh-5.5rem)]")}
        >
          <thead className="sticky top-0 z-10 bg-white/95 shadow-[0_1px_0_0_var(--border)] backdrop-blur [&_th]:bg-transparent">
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-10">
                <SelectAllCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                />
              </th>
              {selected.size > 0 ? (
                <th colSpan={columns.visibleColumns.length}>
                  <div className="flex flex-wrap items-center gap-3 py-0.5 text-sm text-foreground">
                    <span className="font-medium">{selected.size} selected</span>
                    <LeadTagMenu count={selected.size} onTag={applyLeadTag} />
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </th>
              ) : (
                columns.visibleColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.visibleColumns.length + 1}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading students…
                </td>
              </tr>
            ) : visibleRows.length ? (
              visibleRows.map((row) => {
                const efficiency = previousDayEfficiency(row.previousDayOverall);
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "cursor-pointer border-b border-border/60 last:border-0 hover:brightness-[0.97]",
                      efficiencyRowClass(efficiency),
                    )}
                    onClick={() => router.push(`/students/${row.id}`)}
                  >
                    <td
                      onClick={(event) => event.stopPropagation()}
                      className="w-10"
                    >
                      <RowCheckbox
                        checked={isSelected}
                        label={`Select ${fullName(row.firstname, row.lastname)}`}
                        onChange={(checked) => toggleRow(row.id, checked)}
                      />
                    </td>
                    {columns.visibleColumns.map((column) => (
                      <td key={column.key}>
                        <StudentCell
                          columnKey={column.key}
                          row={row}
                          tagId={leadTags.tags[row.id]}
                          onRemoveTag={() => leadTags.setTag([row.id], null)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.visibleColumns.length + 1}>
                  <EmptyState message="No students in this range." />
                </td>
              </tr>
            )}
          </tbody>
        </TableFrame>
      </Panel>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fields={STUDENT_EXPORT_FIELDS}
        onExport={handleExport}
        loading={exporting}
      />
    </div>
  );
}
