"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import { displayDateTime, displayDateValue, displayValue } from "@/lib/display";
import { efficiencyOptions, efficiencyRowClass, todayEfficiency } from "@/lib/efficiency";
import { STUDENT_EXPORT_FIELDS } from "@/lib/fields";
import { STUDENT_TABLE_COLUMNS } from "@/lib/columns";
import { STUDENT_LEAD_TAGS, type LeadTag } from "@/lib/student-tags";
import { fullName, cn } from "@/lib/utils";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { useStudentLeadTags } from "@/hooks/use-student-lead-tags";
import { DateRangeFilter, PageHeader, Pagination } from "@/components/ui/filters";
import { downloadExport, ExportDialog } from "@/components/ui/export-dialog";
import { ColumnPicker } from "@/components/ui/column-picker";
import { TableFrame } from "@/components/ui/data-table";
import {
  LeadTagBadge,
  LeadTagMenu,
  RowCheckbox,
  SelectAllCheckbox,
} from "@/components/ui/lead-tag-menu";
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
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
};

type Payload = {
  total: number;
  page: number;
  pages: number;
  stats: { total: number; active1d: number; active7d: number; active30d: number };
  rows: Student[];
  recent: Student[];
};

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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [onboard, setOnboard] = useState("all");
  const [leadTag, setLeadTag] = useState("all");
  const [applied, setApplied] = useState({
    from: "",
    to: "",
    q: "",
    category: "all",
    onboard: "all",
    leadTag: "all",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const columns = useColumnPrefs("students", STUDENT_TABLE_COLUMNS);
  const leadTags = useStudentLeadTags();

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
    const params = new URLSearchParams({ page: String(page) });
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
          recent: [],
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
  }, [applied, page, taggedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, applied]);

  const visibleIds = data?.rows.map((row) => row.id) || [];
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
                setPage(1);
                setApplied({ from, to, q, category, onboard, leadTag });
              }
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={category}
          className="w-32 shrink-0 sm:w-36"
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
            setApplied({ from, to, q, category: e.target.value, onboard, leadTag });
          }}
        >
          <option value="all">All</option>
          <option value="free">Free</option>
          <option value="subscription">Subscription</option>
        </Select>
        <Select
          value={onboard}
          className="w-44 shrink-0 sm:w-48"
          onChange={(e) => {
            setOnboard(e.target.value);
            setPage(1);
            setApplied({
              from,
              to,
              q,
              category,
              onboard: e.target.value,
              leadTag,
            });
          }}
        >
          <option value="all">All DNA reports</option>
          <option value="generated">DNA generated</option>
          <option value="missing">DNA not generated</option>
        </Select>
        <Select
          value={leadTag}
          className="w-40 shrink-0 sm:w-44"
          onChange={(e) => {
            setLeadTag(e.target.value);
            setPage(1);
            setApplied({ from, to, q, category, onboard, leadTag: e.target.value });
          }}
        >
          <option value="all">All lead tags</option>
          <option value="untagged">Untagged</option>
          {STUDENT_LEAD_TAGS.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label}
              {tagCounts[tag.id] ? ` (${tagCounts[tag.id]})` : ""}
            </option>
          ))}
        </Select>
        <DateRangeFilter
          from={from}
          to={to}
          className="w-auto shrink-0"
          onChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
            setPage(1);
            setApplied((current) => ({
              ...current,
              from: nextFrom,
              to: nextTo,
            }));
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Today’s efficiency</span>
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

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel
          title="User list"
          action={
            <ColumnPicker
              catalog={STUDENT_TABLE_COLUMNS}
              order={columns.prefs.order}
              visible={columns.prefs.visible}
              onToggle={columns.toggle}
              onReorder={columns.reorder}
              onReset={columns.reset}
            />
          }
        >
          <TableFrame columnCount={columns.visibleColumns.length + 1}>
            <thead>
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
                      <span className="font-medium">
                        {selected.size} selected
                      </span>
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
              ) : data?.rows.length ? (
                data.rows.map((row) => {
                  const efficiency = todayEfficiency(
                    row.dailyReportDate,
                    row.dailyReportOverall,
                  );
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
          {data ? (
            <Pagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              onPage={setPage}
            />
          ) : null}
        </Panel>

        <Panel title="Latest activity">
          <div className="space-y-4">
            {data?.recent?.length ? (
              data.recent.map((row) => (
                <div
                  key={row.id}
                  className="cursor-pointer border-b border-border/60 pb-3 last:border-0 hover:opacity-80"
                  onClick={() => router.push(`/students/${row.id}`)}
                >
                  <p className="text-sm font-medium">
                    {fullName(row.firstname, row.lastname)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  <p className="mt-1 text-xs text-primary">
                    {displayDateTime(row.lastActivity)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState message="No recent activity." />
            )}
          </div>
        </Panel>
      </div>

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
