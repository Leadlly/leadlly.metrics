import { formatDate, formatDateTime } from "./dates";

export function displayValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

export function displayDateTime(value: unknown) {
  if (value == null || value === "") return "—";
  return formatDateTime(value as string | Date);
}

export function displayDateValue(value: unknown) {
  if (value == null || value === "") return "—";
  return formatDate(value as string | Date);
}
