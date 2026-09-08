"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { TEACHER_EXPORT_FIELDS } from "@/lib/fields";
import { fullName } from "@/lib/utils";
import { DateRangeFilter, PageHeader, Pagination } from "@/components/ui/filters";
import { downloadExport, ExportDialog } from "@/components/ui/export-dialog";
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

      <Panel title="Staff list">
        <div className="space-y-3 md:hidden">
          {loading ? (
            <EmptyState message="Loading staff…" />
          ) : data?.rows.length ? (
            data.rows.map((row) => (
              <article
                key={row.id}
                className="space-y-2 rounded-2xl border border-border/80 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {fullName(row.firstname, row.lastname)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.email}
                    </p>
                  </div>
                  <Badge tone={row.role === "mentor" ? "blue" : "purple"}>
                    {row.role || "teacher"}
                  </Badge>
                </div>
                <MetaRow label="Status">
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
                </MetaRow>
                <MetaRow label="Students">{row.studentCount}</MetaRow>
                <MetaRow label="Institutes">{row.instituteCount}</MetaRow>
                <MetaRow label="Created">{formatDate(row.createdAt)}</MetaRow>
              </article>
            ))
          ) : (
            <EmptyState message="No teachers or mentors in this range." />
          )}
        </div>

        <div className="-mx-4 hidden overflow-x-auto md:mx-0 md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
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
