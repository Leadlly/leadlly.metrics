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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Export list</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose fields and file format. Filters currently applied on the
              table will be used.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
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

        <div className="mt-4 grid max-h-64 grid-cols-2 gap-2 overflow-auto rounded-2xl border border-border p-3">
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

        <div className="mt-4 flex items-center gap-4 text-sm">
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

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
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
