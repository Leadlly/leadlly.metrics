"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { TEACHER_TABLE_COLUMNS } from "@/lib/columns";
import { displayDateValue, displayValue } from "@/lib/display";
import { TEACHER_EXPORT_FIELDS } from "@/lib/fields";
import { fullName } from "@/lib/utils";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { DateRangeFilter, PageHeader, Pagination } from "@/components/ui/filters";
import { downloadExport, ExportDialog } from "@/components/ui/export-dialog";
import { ColumnPicker } from "@/components/ui/column-picker";
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
import { EmptyState, MetaRow, Panel, StatCard } from "@/components/ui/stat-card";

type Teacher = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  teacherCode: string;
  subjects: string;
  studentCount: number;
  instituteCount: number;
  isBlocked: boolean;
  createdAt?: string;
};

type Payload = {
  total: number;
  page: number;
  pages: number;
  stats: {
    total: number;
    teachers: number;
    mentors: number;
    verified: number;
    blocked: number;
  };
  rows: Teacher[];
};

function TeacherIdentity({ row }: { row: Teacher }) {
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

function statusTone(row: Teacher) {
  if (row.isBlocked) return "red" as const;
  if (row.status === "Verified") return "green" as const;
  return "amber" as const;
}

function TeacherCell({ columnKey, row }: { columnKey: string; row: Teacher }) {
  switch (columnKey) {
    case "name":
      return <TeacherIdentity row={row} />;
    case "role":
      return (
        <Badge tone={row.role === "mentor" ? "blue" : "purple"}>
          {row.role || "teacher"}
        </Badge>
      );
    case "status":
      return (
        <Badge tone={statusTone(row)}>
          {row.isBlocked ? "Blocked" : row.status}
        </Badge>
      );
    case "subjects":
      return <span className="max-w-[180px] truncate">{row.subjects || "—"}</span>;
    case "createdAt":
      return (
        <span className="text-muted-foreground">{displayDateValue(row.createdAt)}</span>
      );
    default:
      return displayValue((row as Record<string, unknown>)[columnKey]);
  }
}

export function TeachersView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [applied, setApplied] = useState({
    from: "",
    to: "",
    q: "",
    role: "all",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const columns = useColumnPrefs("teachers", TEACHER_TABLE_COLUMNS);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);
    if (applied.q) params.set("q", applied.q);
    if (applied.role !== "all") params.set("role", applied.role);
    try {
      const res = await fetch(`/api/teachers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setError("Could not load teachers.");
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
      await downloadExport("/api/teachers/export", {
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
        eyebrow="Mentor platform"
        title="Teachers & mentors"
        description="Staff onboarded on the mentor platform, with role, verification, and student load."
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
              setApplied({ from, to, q, role });
            }}
            onReset={() => {
              setFrom("");
              setTo("");
              setQ("");
              setRole("all");
              setPage(1);
              setApplied({ from: "", to: "", q: "", role: "all" });
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or teacher code"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setApplied({ from, to, q, role });
                  }
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={role}
              className="sm:w-40"
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
                setApplied({ from, to, q, role: e.target.value });
              }}
            >
              <option value="all">All roles</option>
              <option value="teacher">Teachers</option>
              <option value="mentor">Mentors</option>
            </Select>
          </div>
        </div>
      </Panel>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        <StatCard label="All staff" value={data?.stats.total ?? 0} />
        <StatCard label="Teachers" value={data?.stats.teachers ?? 0} />
        <StatCard label="Mentors" value={data?.stats.mentors ?? 0} />
        <StatCard label="Verified" value={data?.stats.verified ?? 0} />
        <StatCard label="Blocked" value={data?.stats.blocked ?? 0} />
      </div>

      <Panel
        title="Staff list"
        action={
          <ColumnPicker
            catalog={TEACHER_TABLE_COLUMNS}
            order={columns.prefs.order}
            visible={columns.prefs.visible}
            onToggle={columns.toggle}
            onReorder={columns.reorder}
            onReset={columns.reset}
          />
        }
      >
        <div className="space-y-3 md:hidden">
          {loading ? (
            <EmptyState message="Loading staff…" />
          ) : data?.rows.length ? (
            data.rows.map((row) => (
              <article
                key={row.id}
                className="space-y-2 rounded-2xl border border-border/80 bg-white p-3"
              >
                {columns.visibleColumns.some((column) => column.key === "name") ? (
                  <div className="flex items-start justify-between gap-2">
                    <TeacherIdentity row={row} />
                    {columns.visibleColumns.some((column) => column.key === "role") ? (
                      <TeacherCell columnKey="role" row={row} />
                    ) : null}
                  </div>
                ) : (
                  columns.visibleColumns
                    .filter((column) => column.key === "role")
                    .map((column) => (
                      <MetaRow key={column.key} label={column.label}>
                        <TeacherCell columnKey={column.key} row={row} />
                      </MetaRow>
                    ))
                )}
                {columns.visibleColumns
                  .filter((column) => column.key !== "name" && column.key !== "role")
                  .map((column) => (
                    <MetaRow key={column.key} label={column.label}>
                      <TeacherCell columnKey={column.key} row={row} />
                    </MetaRow>
                  ))}
              </article>
            ))
          ) : (
            <EmptyState message="No teachers or mentors in this range." />
          )}
        </div>

        <div className="-mx-4 hidden overflow-x-auto md:mx-0 md:block">
          <table
            className="w-full text-left text-sm"
            style={{ minWidth: Math.max(520, columns.visibleColumns.length * 130) }}
          >
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                {columns.visibleColumns.map((column) => (
                  <th key={column.key} className="pb-3 font-medium">
                    {column.label}
                  </th>
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
                    Loading staff…
                  </td>
                </tr>
              ) : data?.rows.length ? (
                data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    {columns.visibleColumns.map((column) => (
                      <td key={column.key} className="py-3 align-top">
                        <TeacherCell columnKey={column.key} row={row} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.visibleColumns.length}>
                    <EmptyState message="No teachers or mentors in this range." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data ? (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            onPage={setPage}
          />
        ) : null}
      </Panel>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fields={TEACHER_EXPORT_FIELDS}
        onExport={handleExport}
        loading={exporting}
      />
    </div>
  );
}
