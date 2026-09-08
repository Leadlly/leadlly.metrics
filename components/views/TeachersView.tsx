"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { TEACHER_EXPORT_FIELDS } from "@/lib/fields";
import { fullName } from "@/lib/utils";
import { DateRangeFilter, Pagination } from "@/components/ui/filters";
import { downloadExport, ExportDialog } from "@/components/ui/export-dialog";
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
import { EmptyState, Panel, StatCard } from "@/components/ui/stat-card";

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Mentor platform
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Teachers & mentors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff onboarded on the mentor platform, with role, verification, and
            student load.
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
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="All staff" value={data?.stats.total ?? 0} />
        <StatCard label="Teachers" value={data?.stats.teachers ?? 0} />
        <StatCard label="Mentors" value={data?.stats.mentors ?? 0} />
        <StatCard label="Verified" value={data?.stats.verified ?? 0} />
        <StatCard label="Blocked" value={data?.stats.blocked ?? 0} />
      </div>

      <Panel title="Staff list">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Subjects</th>
                <th className="pb-3 font-medium">Students</th>
                <th className="pb-3 font-medium">Institutes</th>
                <th className="pb-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Loading staff…
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
                      <Badge tone={row.role === "mentor" ? "blue" : "purple"}>
                        {row.role || "teacher"}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          row.isBlocked
                            ? "red"
                            : row.status === "Verified"
                              ? "green"
                              : "amber"
                        }
                      >
                        {row.isBlocked ? "Blocked" : row.status}
                      </Badge>
                    </td>
                    <td className="max-w-[180px] truncate">{row.subjects || "—"}</td>
                    <td>{row.studentCount}</td>
                    <td>{row.instituteCount}</td>
                    <td className="text-muted-foreground">{formatDate(row.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
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
