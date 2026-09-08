import * as XLSX from "xlsx";
import { csvEscape } from "./utils";
import { BLOCKED_EXPORT_KEYS, type ExportField } from "./fields";

export function pickExportFields(
  requested: string[] | undefined,
  catalog: ExportField[],
) {
  const allowed = new Set(catalog.map((f) => f.key));
  const keys = (requested?.length ? requested : catalog.filter((f) => f.defaultSelected).map((f) => f.key))
    .filter((key) => allowed.has(key) && !BLOCKED_EXPORT_KEYS.has(key));
  return catalog.filter((f) => keys.includes(f.key));
}

export function rowsForExport(
  records: Array<Record<string, unknown>>,
  fields: ExportField[],
) {
  return records.map((record) => {
    const row: Record<string, unknown> = {};
    for (const field of fields) {
      const value = record[field.key];
      if (value instanceof Date) {
        row[field.label] = value.toISOString();
      } else if (typeof value === "boolean") {
        row[field.label] = value ? "yes" : "no";
      } else {
        row[field.label] = value ?? "";
      }
    }
    return row;
  });
}

export function toCsv(rows: Array<Record<string, unknown>>, fields: ExportField[]) {
  const header = fields.map((f) => csvEscape(f.label)).join(",");
  const lines = rows.map((row) =>
    fields.map((f) => csvEscape(row[f.label])).join(","),
  );
  return [header, ...lines].join("\n");
}

export function toXlsx(rows: Array<Record<string, unknown>>, sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function fileResponse(
  body: Buffer | string,
  filename: string,
  format: "csv" | "xlsx",
) {
  const contentType =
    format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv; charset=utf-8";
  const bytes = typeof body === "string" ? Buffer.from(body, "utf-8") : body;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
