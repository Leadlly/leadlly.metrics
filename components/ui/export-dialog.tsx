"use client";

import { useMemo, useState } from "react";
import type { ExportField } from "@/lib/fields";
import { Button } from "./primitives";

export function ExportDialog({
  open,
  onClose,
  fields,
  onExport,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  fields: ExportField[];
  onExport: (selected: string[], format: "csv" | "xlsx") => Promise<void> | void;
  loading?: boolean;
}) {
  const defaults = useMemo(
    () => fields.filter((f) => f.defaultSelected).map((f) => f.key),
    [fields],
  );
  const [selected, setSelected] = useState<string[]>(defaults);
  const [format, setFormat] = useState<"csv" | "xlsx">("xlsx");

  if (!open) return null;

  function toggle(key: string) {
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">Export list</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose fields and file format. Filters currently applied on the
              table will be used.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelected(fields.map((f) => f.key))}
          >
            Select all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-auto rounded-2xl border border-border p-3 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(field.key)}
                onChange={() => toggle(field.key)}
              />
              {field.label}
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={format === "xlsx"}
              onChange={() => setFormat("xlsx")}
            />
            Excel (.xlsx)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={format === "csv"}
              onChange={() => setFormat("csv")}
            />
            CSV
          </label>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={!selected.length || loading}
            onClick={() => onExport(selected, format)}
          >
            {loading ? "Exporting…" : "Download"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export async function downloadExport(
  url: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || "export.csv";
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
