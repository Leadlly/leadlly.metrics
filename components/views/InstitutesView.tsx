"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { INSTITUTE_EXPORT_FIELDS } from "@/lib/fields";
import { DateRangeFilter, PageHeader, Pagination } from "@/components/ui/filters";
import { downloadExport, ExportDialog } from "@/components/ui/export-dialog";
import { Button, Input } from "@/components/ui/primitives";
import { EmptyState, MetaRow, Panel, StatCard } from "@/components/ui/stat-card";

type Institute = {
  id: string;
  name: string;
  instituteCode: string;
  email: string;
  contactNumber: string;
  city: string;
  state: string;
  students: number;
  teachers: number;
  batches: number;
  createdAt?: string;
};

type Payload = {
  total: number;
  page: number;
  pages: number;
  stats: { total: number; batches: number; classes: number; admins: number };
  rows: Institute[];
};

export function InstitutesView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "", q: "" });
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
    try {
      const res = await fetch(`/api/institutes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setError("Could not load institutes.");
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
      await downloadExport("/api/institutes/export", {
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
        eyebrow="Institute portal"
        title="Institutes"
        description="Coaching institutes, their teachers, batches, and linked students."
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
              setApplied({ from, to, q });
            }}
            onReset={() => {
              setFrom("");
              setTo("");
              setQ("");
              setPage(1);
              setApplied({ from: "", to: "", q: "" });
            }}
          />
          <div className="relative w-full min-w-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, code, city, or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setApplied({ from, to, q });
                }
              }}
              className="pl-9"
            />
          </div>
        </div>
      </Panel>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Institutes" value={data?.stats.total ?? 0} />
        <StatCard label="Admins" value={data?.stats.admins ?? 0} />
        <StatCard label="Batches" value={data?.stats.batches ?? 0} />
        <StatCard label="Classes" value={data?.stats.classes ?? 0} />
      </div>

      <Panel title="Institute list">
        <div className="space-y-3 md:hidden">
          {loading ? (
            <EmptyState message="Loading institutes…" />
          ) : data?.rows.length ? (
            data.rows.map((row) => (
              <article
                key={row.id}
                className="space-y-2 rounded-2xl border border-border/80 bg-white p-3"
              >
                <div>
                  <p className="font-medium">{row.name || "—"}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.instituteCode || "No code"}
                  </p>
                </div>
                <MetaRow label="Location">
                  {[row.city, row.state].filter(Boolean).join(", ") || "—"}
                </MetaRow>
                <MetaRow label="Contact">{row.contactNumber || "—"}</MetaRow>
                <MetaRow label="Students">{row.students}</MetaRow>
                <MetaRow label="Teachers">{row.teachers}</MetaRow>
                <MetaRow label="Batches">{row.batches}</MetaRow>
              </article>
            ))
          ) : (
            <EmptyState message="No institutes in this range." />
          )}
        </div>

        <div className="-mx-4 hidden overflow-x-auto md:mx-0 md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-3 font-medium">Institute</th>
                <th className="pb-3 font-medium">Code</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium">Contact</th>
                <th className="pb-3 font-medium">Students</th>
                <th className="pb-3 font-medium">Teachers</th>
                <th className="pb-3 font-medium">Batches</th>
                <th className="pb-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    Loading institutes…
                  </td>
                </tr>
              ) : data?.rows.length ? (
                data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">
                      <p className="font-medium">{row.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.email || "No email"}
                      </p>
                    </td>
                    <td className="font-mono text-xs">{row.instituteCode || "—"}</td>
                    <td>
                      {[row.city, row.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td>{row.contactNumber || "—"}</td>
                    <td>{row.students}</td>
                    <td>{row.teachers}</td>
                    <td>{row.batches}</td>
                    <td className="text-muted-foreground">{formatDate(row.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="No institutes in this range." />
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
        fields={INSTITUTE_EXPORT_FIELDS}
        onExport={handleExport}
        loading={exporting}
      />
    </div>
  );
}
