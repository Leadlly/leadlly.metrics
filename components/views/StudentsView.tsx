"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { displayDateTime, displayDateValue, displayValue } from "@/lib/display";
import { STUDENT_EXPORT_FIELDS } from "@/lib/fields";
import { STUDENT_TABLE_COLUMNS } from "@/lib/columns";
import { fullName } from "@/lib/utils";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { DateRangeFilter, PageHeader, Pagination } from "@/components/ui/filters";
import { downloadExport, ExportDialog } from "@/components/ui/export-dialog";
import { ColumnPicker } from "@/components/ui/column-picker";
import { TableFrame } from "@/components/ui/data-table";
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
  disabled?: boolean;
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

function StudentIdentity({ row }: { row: Student }) {
  return (
    <div className="min-w-0">
      <p className="font-medium">{fullName(row.firstname, row.lastname)}</p>
      <p className="truncate text-xs text-muted-foreground">{row.email}</p>
      {row.phone ? (
        <p className="text-xs text-muted-foreground">{row.phone}</p>
      ) : null}
    </div>
  );
}

function StudentCell({ columnKey, row }: { columnKey: string; row: Student }) {
  switch (columnKey) {
    case "student":
      return <StudentIdentity row={row} />;
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
    case "disabled":
      return displayValue(row.disabled);
    default:
      return displayValue((row as Record<string, unknown>)[columnKey]);
  }
}

export function StudentsView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [applied, setApplied] = useState({ from: "", to: "", q: "", category: "all" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const columns = useColumnPrefs("students", STUDENT_TABLE_COLUMNS);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);
    if (applied.q) params.set("q", applied.q);
    if (applied.category !== "all") params.set("category", applied.category);
    try {
      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setError("Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

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
          <Button onClick={() => setExportOpen(true)} className="w-full sm:w-auto">
            <Download className="size-4" />
            Export
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-4">
          <DateRangeFilter
            from={from}
            to={to}
            onFrom={setFrom}
            onTo={setTo}
            onApply={() => {
              setPage(1);
              setApplied({ from, to, q, category });
            }}
            onReset={() => {
              setFrom("");
              setTo("");
              setQ("");
              setCategory("all");
              setPage(1);
              setApplied({ from: "", to: "", q: "", category: "all" });
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setApplied({ from, to, q, category });
                  }
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={category}
              className="sm:w-40"
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
                setApplied({ from, to, q, category: e.target.value });
              }}
            >
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="subscription">Subscription</option>
            </Select>
          </div>
        </div>
      </Panel>

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
          <TableFrame columnCount={columns.visibleColumns.length}>
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                {columns.visibleColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.visibleColumns.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading students…
                  </td>
                </tr>
              ) : data?.rows.length ? (
                data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    {columns.visibleColumns.map((column) => (
                      <td key={column.key}>
                        <StudentCell columnKey={column.key} row={row} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.visibleColumns.length}>
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
                <div key={row.id} className="border-b border-border/60 pb-3 last:border-0">
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
