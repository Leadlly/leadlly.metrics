"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/dates";
import { STUDENT_EXPORT_FIELDS } from "@/lib/fields";
import { fullName } from "@/lib/utils";
import { DateRangeFilter, Pagination } from "@/components/ui/filters";
import { downloadExport, ExportDialog } from "@/components/ui/export-dialog";
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
import { EmptyState, Panel, StatCard } from "@/components/ui/stat-card";

type Student = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  category: string;
  standard: string;
  exam: string;
  institute: string;
  subscription: string;
  level: number;
  streak: number;
  createdAt?: string;
  lastActivity?: string;
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Student app
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activity, signups, and user-level data. Filter by created date and
            export the list.
          </p>
        </div>
        <Button onClick={() => setExportOpen(true)}>
          <Download className="size-4" />
          Export
        </Button>
      </div>

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
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
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
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
                setApplied({ from, to, q, category: e.target.value });
              }}
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="consistency">Consistency</option>
              <option value="pro">Pro</option>
              <option value="plus">Plus</option>
            </Select>
          </div>
        </div>
      </Panel>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users in range" value={data?.stats.total ?? 0} />
        <StatCard
          label="Active today"
          value={data?.stats.active1d ?? 0}
          hint="Updated in last 24 hours"
        />
        <StatCard
          label="Active 7 days"
          value={data?.stats.active7d ?? 0}
        />
        <StatCard
          label="Active 30 days"
          value={data?.stats.active30d ?? 0}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <Panel title="User list">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Exam / class</th>
                  <th className="pb-3 font-medium">Institute</th>
                  <th className="pb-3 font-medium">Subscription</th>
                  <th className="pb-3 font-medium">Last activity</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      Loading students…
                    </td>
                  </tr>
                ) : data?.rows.length ? (
                  data.rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3">
                        <p className="font-medium">
                          {fullName(row.firstname, row.lastname)}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                        {row.phone ? (
                          <p className="text-xs text-muted-foreground">{row.phone}</p>
                        ) : null}
                      </td>
                      <td>
                        <Badge tone={categoryTone(row.category)}>
                          {row.category || "free"}
                        </Badge>
                      </td>
                      <td>
                        <p>{row.exam || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.standard ? `Class ${row.standard}` : "—"}
                        </p>
                      </td>
                      <td>{row.institute || "—"}</td>
                      <td>
                        <Badge tone={subTone(row.subscription)}>
                          {row.subscription}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground">
                        {formatDateTime(row.lastActivity)}
                      </td>
                      <td className="text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState message="No students in this range." />
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

        <Panel title="Latest activity">
          <div className="space-y-4">
            {data?.recent?.length ? (
              data.recent.map((row) => (
                <div key={row.id} className="border-b border-border/60 pb-3 last:border-0">
                  <p className="text-sm font-medium">
                    {fullName(row.firstname, row.lastname)}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.email}</p>
                  <p className="mt-1 text-xs text-primary">
                    {formatDateTime(row.lastActivity)}
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
